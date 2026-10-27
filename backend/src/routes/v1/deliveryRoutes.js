const express = require("express");

const router = express.Router();
const { protect, adminOnly } = require("../../middleware/auth.middleware");
const { policies } = require("../../middleware/rateLimit.middleware");
const {
  getDeliveryZones,
  updateDeliveryZones,
} = require("../../controllers/v1/deliveryController");

router.get("/get-zones", policies.browsing, getDeliveryZones);
router.patch("/update-zones", protect, adminOnly, policies.admin, updateDeliveryZones);

module.exports = router;
