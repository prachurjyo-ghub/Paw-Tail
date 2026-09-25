const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const {
  getPromoCodes,
  postPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeActive,
  validatePromoCode,
  checkPromoCode,
} = require("../../controllers/v1/promoCodeController.js");

router.get("/get-promo-codes", protect, adminOnly, getPromoCodes);
router.post("/post-promo-codes", protect, adminOnly, postPromoCode);
router.patch("/update-promo-codes/:id", protect, adminOnly, updatePromoCode);
router.delete("/delete-promo-codes/:id", protect, adminOnly, deletePromoCode);
router.patch(
  "/active-on-off-promo-codes/:id",
  protect,
  adminOnly,
  togglePromoCodeActive
);
router.post("/validate-promo-code", protect, validatePromoCode);
router.post("/check-promo-code", checkPromoCode);

module.exports = router;
