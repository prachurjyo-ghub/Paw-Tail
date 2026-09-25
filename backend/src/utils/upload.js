const multer = require("multer");

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const createImageUpload = ({ maxSizeKB = 500 } = {}) => {
  const fileFilter = (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, and WebP images are allowed");
      error.code = "INVALID_IMAGE_TYPE";
      return cb(error);
    }

    cb(null, true);
  };

  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: maxSizeKB * 1024,
      files: 10,
      fields: 30,
      parts: 50,
      fieldNameSize: 100,
      fieldSize: 100 * 1024,
      fieldNestingDepth: 3,
      fieldArrayIndexLimit: 100,
    },
  });
};

const validateImageFile = async (file) => {
  if (!file?.buffer?.length) {
    const error = new Error("Uploaded image content is missing");
    error.code = "INVALID_IMAGE_CONTENT";
    throw error;
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(file.buffer);
  const expectedExtension = ALLOWED_IMAGE_TYPES.get(file.mimetype);

  if (!detected || !ALLOWED_IMAGE_TYPES.has(detected.mime)) {
    const error = new Error("Uploaded file is not a supported image");
    error.code = "UNSUPPORTED_IMAGE_FORMAT";
    throw error;
  }

  if (
    detected.mime !== file.mimetype ||
    detected.ext !== expectedExtension
  ) {
    const error = new Error(
      "Uploaded image content does not match its declared type"
    );
    error.code = "INVALID_IMAGE_CONTENT";
    throw error;
  }

  return detected;
};

module.exports = {
  ALLOWED_IMAGE_TYPES,
  createImageUpload,
  validateImageFile,
};
