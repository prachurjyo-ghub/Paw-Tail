const fs = require("fs");
const path = require("path");

const deleteImageFile = (imagePath, folderName) => {
  if (!imagePath || typeof imagePath !== "string") {
    return;
  }

  const prefix = `/uploads/${folderName}/`;
  if (!imagePath.startsWith(prefix)) {
    return;
  }

  const uploadsRoot = path.resolve(__dirname, "..", "..", "uploads");
  const relativePath = imagePath.replace(/^\/uploads\//, "");
  const filePath = path.resolve(uploadsRoot, relativePath);

  if (
    filePath.startsWith(`${uploadsRoot}${path.sep}`) &&
    fs.existsSync(filePath)
  ) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  deleteImageFile,
};
