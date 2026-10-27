const express = require("express");
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getBanners,
  postBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} = require("../../controllers/v1/bannerController.js");

const bannerImageUpload = createImageUpload({
  folder: "banners",
  maxSizeKB: 4096,
});

router.get("/get-banners", policies.browsing, optionalAuth, getBanners);
router.post(
  "/post-banners",
  protect,
  adminOnly,
  policies.upload,
  bannerImageUpload.single("image"),
  postBanner
);
router.patch(
  "/update-banners/:id",
  protect,
  adminOnly,
  policies.upload,
  bannerImageUpload.single("image"),
  updateBanner
);
router.delete("/delete-banners/:id", protect, adminOnly, policies.admin, deleteBanner);
router.patch(
  "/active-on-off-banners/:id",
  protect,
  adminOnly,
  policies.admin,
  toggleBannerActive
);

module.exports = router;
