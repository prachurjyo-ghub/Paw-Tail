const express = require("express");
const router = express.Router();

const {
  protect,
  adminOnly,
  optionalAuth,
} = require("../../middleware/auth.middleware.js");
const {
  getReviews,
  postReview,
  approveReview,
  replyReview,
  hideReview,
  deleteReview,
} = require("../../controllers/v1/reviewController.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");

router.get("/get-reviews", policies.browsing, optionalAuth, getReviews);
router.post("/post-reviews", protect, policies.mutation, postReview);
router.patch("/approve-reviews/:id", protect, adminOnly, policies.admin, approveReview);
router.patch("/reply-reviews/:id", protect, adminOnly, policies.admin, replyReview);
router.patch("/hide-reviews/:id", protect, adminOnly, policies.admin, hideReview);
router.delete("/delete-reviews/:id", protect, adminOnly, policies.admin, deleteReview);

module.exports = router;
