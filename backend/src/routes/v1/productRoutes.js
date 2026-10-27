const express = require("express");
const router = express.Router();

const { protect, adminOnly, optionalAuth } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getProducts,
  getDeletedProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../../controllers/v1/productController.js");

const productImageUpload = createImageUpload({
  folder: "products",
  maxSizeKB: 4096,
});

// Public
router.get("/get-products", policies.search, optionalAuth, getProducts);
router.get("/get-product/:slug", policies.browsing, optionalAuth, getSingleProduct);
router.get("/get-deleted-products",
  protect, adminOnly, policies.admin,
  getDeletedProducts);

// Admin only
router.post(
  "/create-product",
  protect,
  adminOnly,
  policies.upload,
  productImageUpload.array("images", 10),
  createProduct
);
router.patch(
  "/update-product/:slug",
  protect,
  adminOnly,
  policies.upload,
  productImageUpload.array("images", 10),
  updateProduct
);
router.delete("/delete-product/:slug", 
  protect, adminOnly, policies.admin,
  deleteProduct);

module.exports = router;
