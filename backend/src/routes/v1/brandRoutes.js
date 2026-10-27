const express = require("express");
const router = express.Router();

const { protect, adminOnly, optionalAuth } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getBrands,
  createBrand,
  updateBrandBySlug,
  deleteBrandBySlug,
  toggleBrandActiveBySlug,
} = require("../../controllers/v1/brandController.js");

const brandImageUpload = createImageUpload({
  folder: "brands",
  maxSizeKB: 4096,
});

router.get("/get-brands", policies.browsing, optionalAuth, getBrands);
router.post(
  "/create-brand",
  protect,
  adminOnly,
  policies.upload,
  brandImageUpload.single("image"),
  createBrand
);
router.patch(
  "/update-brand/:slug",
  protect,
  adminOnly,
  policies.upload,
  brandImageUpload.single("image"),
  updateBrandBySlug
);
router.delete("/delete-brand/:slug", protect, adminOnly, policies.admin, deleteBrandBySlug);
router.patch("/active-on-off-brand/:slug", protect, adminOnly, policies.admin, toggleBrandActiveBySlug);

module.exports = router;
