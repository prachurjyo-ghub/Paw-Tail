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

router.post("/create-inquiry", optionalAuth, createInquiry);
router.get("/my-inquiries", protect, getMyInquiries);
router.get("/get-inquiries", protect, adminOnly, getInquiriesAdmin);
router.patch("/update-inquiry/:id", protect, adminOnly, updateInquiry);

module.exports = router;
