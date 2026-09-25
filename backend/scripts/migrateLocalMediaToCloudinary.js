const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || undefined,
});

const env = require("../src/config/env");
const {
  assertCloudinaryConfigured,
  cloudinary,
} = require("../src/config/cloudinary");
const Animal = require("../src/models/Animal");
const Banner = require("../src/models/Banner");
const Brand = require("../src/models/Brand");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const User = require("../src/models/User");
const { isCloudinaryMedia, toCloudinaryMedia } = require("../src/models/media");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const execute = args.has("--execute");
const uploadsRoot = path.resolve(__dirname, "..", "uploads");

const resources = [
  { Model: Product, model: "Product", field: "images", folder: "products", many: true },
  { Model: User, model: "User", field: "profilePic", folder: "users" },
  { Model: Category, model: "Category", field: "image", folder: "categories" },
  { Model: Animal, model: "Animal", field: "image", folder: "animals" },
  { Model: Brand, model: "Brand", field: "image", folder: "brands" },
  { Model: Banner, model: "Banner", field: "imageUrl", folder: "banners" },
];

const assertSafeExecution = () => {
  if (process.env.MEDIA_MIGRATION_ENABLED !== "true") {
    throw new Error("MEDIA_MIGRATION_ENABLED=true is required");
  }

  if (dryRun === execute) {
    throw new Error("Choose exactly one mode: --dry-run or --execute");
  }

  if (
    env.isProduction &&
    process.env.MEDIA_MIGRATION_ALLOW_PRODUCTION !== "true"
  ) {
    throw new Error(
      "Production migration requires MEDIA_MIGRATION_ALLOW_PRODUCTION=true"
    );
  }

  if (execute) {
    assertCloudinaryConfigured();
  }
};

const resolveLegacyFile = (value, folder) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  let relative = value.trim().replace(/^https?:\/\/[^/]+/i, "");
  if (relative.startsWith("/uploads/")) {
    relative = relative.slice("/uploads/".length);
  } else if (!relative.includes("/")) {
    relative = `${folder}/${relative}`;
  } else {
    return null;
  }

  const absolutePath = path.resolve(uploadsRoot, relative);
  if (
    absolutePath !== uploadsRoot &&
    !absolutePath.startsWith(`${uploadsRoot}${path.sep}`)
  ) {
    return null;
  }

  return absolutePath;
};

const uploadLegacyFile = async (filePath, folder) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "image",
    folder: `${env.cloudinaryFolderPrefix}/${folder}`,
    public_id: randomUUID(),
    overwrite: false,
    unique_filename: false,
  });

  return toCloudinaryMedia(result);
};

const migrateValue = async ({ value, folder, record }) => {
  if (!value || isCloudinaryMedia(value)) {
    record.status = value ? "already_cloudinary" : "skipped_empty";
    return { value, changed: false };
  }

  const filePath = resolveLegacyFile(value, folder);
  if (!filePath) {
    record.status = "skipped_non_local";
    return { value, changed: false };
  }

  try {
    await fs.access(filePath);
  } catch {
    record.status = "missing";
    record.filePath = filePath;
    return { value, changed: false };
  }

  record.filePath = filePath;
  if (dryRun) {
    record.status = "would_migrate";
    return { value, changed: false };
  }

  const media = await uploadLegacyFile(filePath, folder);
  record.status = "uploaded";
  record.publicId = media.publicId;
  record.secureUrl = media.secureUrl;
  return { value: media, changed: true, uploaded: media };
};

const migrateResource = async (resource, manifest) => {
  const documents = await resource.Model.collection.find({}).toArray();

  for (const document of documents) {
    const current = document[resource.field];
    const values = resource.many
      ? Array.isArray(current)
        ? current
        : current
          ? [current]
          : []
      : [current];
    const nextValues = [];
    const uploaded = [];
    let changed = false;

    for (const value of values) {
      const record = {
        model: resource.model,
        documentId: String(document._id),
        field: resource.field,
        legacyValue: typeof value === "string" ? value : null,
      };
      const result = await migrateValue({
        value,
        folder: resource.folder,
        record,
      });
      manifest.push(record);
      nextValues.push(result.value);
      changed ||= result.changed;
      if (result.uploaded) uploaded.push(result.uploaded);
    }

    if (!execute || !changed) {
      continue;
    }

    const nextValue = resource.many ? nextValues : nextValues[0];
    try {
      const updateResult = await resource.Model.collection.updateOne(
        { _id: document._id, [resource.field]: current },
        { $set: { [resource.field]: nextValue } }
      );
      if (updateResult.matchedCount !== 1) {
        throw new Error(
          `${resource.model} ${document._id} changed during migration`
        );
      }
      manifest.push({
        model: resource.model,
        documentId: String(document._id),
        field: resource.field,
        status: "database_updated",
      });
    } catch (error) {
      await Promise.allSettled(
        uploaded.map((media) =>
          cloudinary.uploader.destroy(media.publicId, {
            resource_type: "image",
            invalidate: true,
          })
        )
      );
      throw error;
    }
  }
};

const run = async () => {
  assertSafeExecution();
  const manifest = [];

  await mongoose.connect(env.mongodbUri);
  try {
    for (const resource of resources) {
      await migrateResource(resource, manifest);
    }

    const outputDirectory = path.resolve(__dirname, "..", "migration-output");
    await fs.mkdir(outputDirectory, { recursive: true });
    const outputPath = path.join(
      outputDirectory,
      `media-migration-${dryRun ? "dry-run" : "execute"}-${Date.now()}.json`
    );
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

    const counts = manifest.reduce((summary, item) => {
      summary[item.status] = (summary[item.status] || 0) + 1;
      return summary;
    }, {});
    console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "execute", counts, outputPath }));
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`Media migration failed: ${error.message}`);
  process.exitCode = 1;
});
