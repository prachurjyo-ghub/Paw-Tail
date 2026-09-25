const mongoose = require("mongoose");

const cloudinaryMediaSchema = new mongoose.Schema(
  {
    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      min: 1,
      default: null,
    },
    height: {
      type: Number,
      min: 1,
      default: null,
    },
    format: {
      type: String,
      trim: true,
      default: null,
    },
    bytes: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false }
);

const isLegacyMedia = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isCloudinaryMedia = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const secureUrl = value.secureUrl;
  const publicId = value.publicId;

  return (
    typeof secureUrl === "string" &&
    secureUrl.startsWith("https://") &&
    typeof publicId === "string" &&
    publicId.trim().length > 0
  );
};

const isMediaValue = (value) =>
  value === null ||
  value === undefined ||
  isLegacyMedia(value) ||
  isCloudinaryMedia(value);

const mediaField = ({ required = false } = {}) => ({
  type: mongoose.Schema.Types.Mixed,
  required,
  default: required ? undefined : null,
  validate: {
    validator: isMediaValue,
    message:
      "Media must be a legacy path or Cloudinary metadata with secureUrl and publicId",
  },
});

const toCloudinaryMedia = (result) => ({
  secureUrl: result.secure_url,
  publicId: result.public_id,
  width: result.width || null,
  height: result.height || null,
  format: result.format || null,
  bytes: result.bytes ?? null,
});

const getMediaUrl = (value) => {
  if (isLegacyMedia(value)) return value.trim();
  if (isCloudinaryMedia(value)) return value.secureUrl;
  return null;
};

module.exports = {
  cloudinaryMediaSchema,
  getMediaUrl,
  isCloudinaryMedia,
  isLegacyMedia,
  isMediaValue,
  mediaField,
  toCloudinaryMedia,
};
