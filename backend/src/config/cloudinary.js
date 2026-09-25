const { v2: cloudinary } = require("cloudinary");

const env = require("./env");

const configured = Boolean(
  env.cloudinaryCloudName &&
    env.cloudinaryApiKey &&
    env.cloudinaryApiSecret &&
    env.cloudinaryFolderPrefix
);

if (configured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

const assertCloudinaryConfigured = () => {
  if (!configured) {
    const error = new Error("Cloudinary media storage is not configured");
    error.code = "CLOUDINARY_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }
};

module.exports = {
  cloudinary,
  assertCloudinaryConfigured,
  isCloudinaryConfigured: configured,
};
