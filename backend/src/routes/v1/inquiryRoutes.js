const express = require("express");
const router = express.Router();

const {
  protect,
  adminOnly,
  optionalAuth,
} = require("../../middleware/auth.middleware.js");
const {
  createInquiry,
  getInquiriesAdmin,
  getMyInquiries,
  updateInquiry,
} = require("../../controllers/v1/inquiryController.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");

router.post("/create-inquiry", policies.inquiry, optionalAuth, createInquiry);
router.get("/my-inquiries", protect, getMyInquiries);
router.get("/get-inquiries", protect, adminOnly, policies.admin, getInquiriesAdmin);
router.patch("/update-inquiry/:id", protect, adminOnly, policies.admin, updateInquiry);

module.exports = router;
