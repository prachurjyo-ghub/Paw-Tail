const { randomUUID } = require("crypto");

const {
  assertCloudinaryConfigured,
  cloudinary,
} = require("../config/cloudinary");
const env = require("../config/env");
const {
  isCloudinaryMedia,
  toCloudinaryMedia,
} = require("../models/media");
const logger = require("../utils/logger");
const { validateImageFile } = require("../utils/upload");

const DEFAULT_UPLOAD_CONCURRENCY = 3;

const createMediaService = ({
  uploader = cloudinary.uploader,
  assertConfigured = assertCloudinaryConfigured,
  folderPrefix = env.cloudinaryFolderPrefix,
  validateFile = validateImageFile,
  uploadConcurrency = DEFAULT_UPLOAD_CONCURRENCY,
} = {}) => {
  const uploadImage = async (file, resource) => {
    assertConfigured();
    await validateFile(file);

    const folder = `${folderPrefix}/${resource}`;
    const publicId = randomUUID();

    const result = await new Promise((resolve, reject) => {
      const stream = uploader.upload_stream(
        {
          resource_type: "image",
          folder,
          public_id: publicId,
          overwrite: false,
          unique_filename: false,
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(uploadResult);
        }
      );

      stream.end(file.buffer);
    });

    return toCloudinaryMedia(result);
  };

  const destroyByPublicId = async (publicId) => {
    if (!publicId) return { result: "not found" };
    assertConfigured();

    const result = await uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    return result;
  };

  const destroyMedia = async (media, context = {}) => {
    if (!isCloudinaryMedia(media)) {
      return { result: "not applicable" };
    }

    try {
      return await destroyByPublicId(media.publicId);
    } catch (error) {
      logger.error("cloudinary.destroy_failed", {
        requestId: context.requestId,
        resource: context.resource,
        entityId: context.entityId ? String(context.entityId) : undefined,
        publicId: media.publicId,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };

  const destroyMany = async (mediaItems, context = {}) => {
    const results = await Promise.allSettled(
      (mediaItems || []).map((media) => destroyMedia(media, context))
    );

    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      const error = new Error(
        `Failed to clean up ${failures.length} Cloudinary asset(s)`
      );
      error.code = "CLOUDINARY_CLEANUP_FAILED";
      throw error;
    }

    return results.map((result) => result.value);
  };

  const uploadMany = async (files, resource, context = {}) => {
    const pendingFiles = Array.from(files || []);
    if (!pendingFiles.length) return [];

    const uploaded = new Array(pendingFiles.length);
    const workerCount = Math.min(
      Math.max(1, Number.parseInt(uploadConcurrency, 10) || 1),
      pendingFiles.length
    );
    let nextIndex = 0;
    let uploadFailed = false;

    const uploadNext = async () => {
      while (!uploadFailed) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= pendingFiles.length) return;

        try {
          uploaded[index] = await uploadImage(pendingFiles[index], resource);
        } catch (error) {
          uploadFailed = true;
          throw error;
        }
      }
    };

    const workerResults = await Promise.allSettled(
      Array.from({ length: workerCount }, () => uploadNext())
    );
    const failure = workerResults.find((result) => result.status === "rejected");

    if (failure) {
      await destroyMany(uploaded.filter(Boolean), {
        ...context,
        resource,
      }).catch(() => undefined);
      throw failure.reason;
    }

    return uploaded;
  };

  return {
    destroyByPublicId,
    destroyMedia,
    destroyMany,
    uploadImage,
    uploadMany,
  };
};

const mediaService = createMediaService();

const replaceSingleMedia = async ({
  file,
  currentMedia,
  resource,
  save,
  context = {},
  service = mediaService,
}) => {
  const uploaded = await service.uploadImage(file, resource);

  try {
    await save(uploaded);
  } catch (error) {
    await service
      .destroyMedia(uploaded, { ...context, resource })
      .catch(() => undefined);
    throw error;
  }

  if (currentMedia && currentMedia !== uploaded) {
    await service
      .destroyMedia(currentMedia, { ...context, resource })
      .catch(() => undefined);
  }

  return uploaded;
};

const persistUploadedMedia = async ({
  files,
  resource,
  persist,
  context = {},
  service = mediaService,
}) => {
  const uploaded = await service.uploadMany(files, resource, context);

  try {
    const value = await persist(uploaded);
    return { uploaded, value };
  } catch (error) {
    await service
      .destroyMany(uploaded, { ...context, resource })
      .catch(() => undefined);
    throw error;
  }
};

module.exports = {
  createMediaService,
  mediaService,
  persistUploadedMedia,
  replaceSingleMedia,
};
