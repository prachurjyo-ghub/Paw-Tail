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
  replyReview,
  hideReview,
  deleteReview,
} = require("../../controllers/v1/reviewController.js");

router.get("/get-reviews", optionalAuth, getReviews);
router.post("/post-reviews", protect, postReview);
router.patch("/reply-reviews/:id", protect, adminOnly, replyReview);
router.patch("/hide-reviews/:id", protect, adminOnly, hideReview);
router.delete("/delete-reviews/:id", protect, adminOnly, deleteReview);

module.exports = router;
