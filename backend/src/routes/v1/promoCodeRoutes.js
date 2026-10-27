const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getPromoCodes,
  postPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeActive,
  validatePromoCode,
  checkPromoCode,
} = require("../../controllers/v1/promoCodeController.js");

router.get("/get-promo-codes", protect, adminOnly, policies.admin, getPromoCodes);
router.post("/post-promo-codes", protect, adminOnly, policies.admin, postPromoCode);
router.patch("/update-promo-codes/:id", protect, adminOnly, policies.admin, updatePromoCode);
router.delete("/delete-promo-codes/:id", protect, adminOnly, policies.admin, deletePromoCode);
router.patch(
  "/active-on-off-promo-codes/:id",
  protect,
  adminOnly,
  policies.admin,
  togglePromoCodeActive
);
router.post("/validate-promo-code", protect, policies.mutation, validatePromoCode);
router.post("/check-promo-code", policies.search, checkPromoCode);

module.exports = router;
