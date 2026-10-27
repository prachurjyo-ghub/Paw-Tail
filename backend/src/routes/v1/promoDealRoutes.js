const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getPromoDeals,
  getPromoDealsAdmin,
  updatePromoDeals,
} = require("../../controllers/v1/promoDealController.js");

router.get("/get-promo-deals", policies.browsing, getPromoDeals);
router.get("/admin/get-promo-deals", protect, adminOnly, policies.admin, getPromoDealsAdmin);
router.put("/admin/update-promo-deals", protect, adminOnly, policies.admin, updatePromoDeals);

module.exports = router;
