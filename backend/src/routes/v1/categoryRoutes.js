const express = require("express");
const router = express.Router();

const { protect, adminOnly, optionalAuth } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getCategories,
  createCategory,
  updateCategoryBySlug,
  deleteCategoryBySlug,
  toggleCategoryActiveBySlug,
} = require("../../controllers/v1/categoryController.js");

const categoryImageUpload = createImageUpload({
  folder: "categories",
  maxSizeKB: 4096,
});

router.get("/get-categories", policies.browsing, optionalAuth, getCategories);
router.post(
  "/create-category",
  protect,
  adminOnly,
  policies.upload,
  categoryImageUpload.single("image"),
  createCategory
);
router.patch(
  "/update-category/:slug",
  protect,
  adminOnly,
  policies.upload,
  categoryImageUpload.single("image"),
  updateCategoryBySlug
);
router.delete("/delete-category/:slug", protect, adminOnly, policies.admin, deleteCategoryBySlug);
router.patch(
  "/active-on-off-animals/:slug",
  protect,
  adminOnly,
  policies.admin,
  toggleCategoryActiveBySlug
);

module.exports = router;
