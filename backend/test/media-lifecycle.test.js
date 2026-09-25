const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/pawtail_test";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";

const {
  createMediaService,
  persistUploadedMedia,
  replaceSingleMedia,
} = require("../src/services/mediaService");
const { selectOwnedMedia } = require("../src/utils/media");

const oldMedia = {
  secureUrl: "https://res.cloudinary.com/demo/image/upload/old.jpg",
  publicId: "test/products/old",
};
const newMedia = {
  secureUrl: "https://res.cloudinary.com/demo/image/upload/new.jpg",
  publicId: "test/products/new",
};

test("create DB failure destroys every newly uploaded asset", async () => {
  const destroyed = [];
  const service = {
    uploadMany: async () => [newMedia],
    destroyMany: async (items) => {
      destroyed.push(...items);
    },
  };

  await assert.rejects(
    persistUploadedMedia({
      files: [{}],
      resource: "products",
      service,
      persist: async () => {
        throw new Error("database create failed");
      },
    }),
    /database create failed/
  );

  assert.deepEqual(destroyed, [newMedia]);
});

test("replacement DB failure destroys new media and retains old media", async () => {
  const destroyed = [];
  let storedMedia = oldMedia;
  const service = {
    uploadImage: async () => newMedia,
    destroyMedia: async (media) => {
      destroyed.push(media);
    },
  };

  await assert.rejects(
    replaceSingleMedia({
      file: {},
      currentMedia: oldMedia,
      resource: "users",
      service,
      save: async () => {
        throw new Error("database update failed");
      },
    }),
    /database update failed/
  );

  assert.equal(storedMedia, oldMedia);
  assert.deepEqual(destroyed, [newMedia]);
});

test("successful replacement persists new media before old cleanup", async () => {
  const events = [];
  const service = {
    uploadImage: async () => {
      events.push("upload-new");
      return newMedia;
    },
    destroyMedia: async (media) => {
      events.push(`destroy:${media.publicId}`);
    },
  };

  await replaceSingleMedia({
    file: {},
    currentMedia: oldMedia,
    resource: "brands",
    service,
    save: async () => {
      events.push("save-new");
    },
  });

  assert.deepEqual(events, [
    "upload-new",
    "save-new",
    `destroy:${oldMedia.publicId}`,
  ]);
});

test("partial multi-upload failure cleans already uploaded request assets", async () => {
  let uploadNumber = 0;
  const destroyed = [];
  const uploader = {
    upload_stream(options, callback) {
      uploadNumber += 1;
      return {
        end() {
          if (uploadNumber === 2) {
            callback(new Error("provider unavailable"));
            return;
          }
          callback(null, {
            secure_url: `https://res.cloudinary.com/demo/image/upload/${options.public_id}.jpg`,
            public_id: `test/products/${options.public_id}`,
            width: 1,
            height: 1,
            format: "jpg",
            bytes: 10,
          });
        },
      };
    },
    async destroy(publicId) {
      destroyed.push(publicId);
      return { result: "ok" };
    },
  };
  const service = createMediaService({
    uploader,
    assertConfigured: () => undefined,
    folderPrefix: "test",
    validateFile: async () => ({ mime: "image/png", ext: "png" }),
  });

  await assert.rejects(
    service.uploadMany(
      [{ buffer: Buffer.from("one") }, { buffer: Buffer.from("two") }],
      "products"
    ),
    /provider unavailable/
  );

  assert.equal(destroyed.length, 1);
  assert.match(destroyed[0], /^test\/products\//);
});

test("multi-upload uses bounded concurrency and preserves image order", async () => {
  let activeUploads = 0;
  let peakUploads = 0;
  const uploader = {
    upload_stream(options, callback) {
      return {
        end(buffer) {
          activeUploads += 1;
          peakUploads = Math.max(peakUploads, activeUploads);
          const sequence = Number(buffer.toString());
          setTimeout(() => {
            activeUploads -= 1;
            callback(null, {
              secure_url: `https://res.cloudinary.com/demo/image/upload/${sequence}.jpg`,
              public_id: `test/products/${sequence}`,
              width: 1,
              height: 1,
              format: "jpg",
              bytes: 10,
            });
          }, 5 * (4 - sequence));
        },
      };
    },
  };
  const service = createMediaService({
    uploader,
    assertConfigured: () => undefined,
    folderPrefix: "test",
    uploadConcurrency: 2,
    validateFile: async () => ({ mime: "image/png", ext: "png" }),
  });

  const uploaded = await service.uploadMany(
    [1, 2, 3].map((value) => ({ buffer: Buffer.from(String(value)) })),
    "products"
  );

  assert.equal(peakUploads, 2);
  assert.deepEqual(
    uploaded.map((media) => media.publicId),
    ["test/products/1", "test/products/2", "test/products/3"]
  );
});

test("retained media tokens can only select assets owned by the record", () => {
  const otherPublicId = "test/products/unrelated";
  const selected = selectOwnedMedia(
    [oldMedia, "/uploads/products/legacy.jpg"],
    JSON.stringify([otherPublicId, oldMedia.publicId])
  );

  assert.deepEqual(selected, [oldMedia]);
});
