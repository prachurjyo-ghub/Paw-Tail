const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const {
  getPromoDeals,
  getPromoDealsAdmin,
  updatePromoDeals,
} = require("../../controllers/v1/promoDealController.js");

router.get("/get-promo-deals", getPromoDeals);
router.get("/admin/get-promo-deals", protect, adminOnly, getPromoDealsAdmin);
router.put("/admin/update-promo-deals", protect, adminOnly, updatePromoDeals);

module.exports = router;
