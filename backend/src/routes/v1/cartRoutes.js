const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware.js");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  calculateCart,
} = require("../../controllers/v1/cartController.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");

router.get("/get-cart", protect, getCart);
router.post("/add-to-cart", protect, policies.mutation, addToCart);
router.post("/calculate-cart", protect, policies.mutation, calculateCart);
router.patch("/update-cart-item/:itemId", protect, policies.mutation, updateCartItem);
router.delete("/remove-cart-item/:itemId", protect, policies.mutation, removeCartItem);
router.delete("/clear-cart", protect, policies.mutation, clearCart);

module.exports = router;
