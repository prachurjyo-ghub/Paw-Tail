const mongoose = require("mongoose");

const Review = require("../../models/Review");
const Product = require("../../models/Product");
const { getProductRating } = require("../../utils/reviewRatings");

const getProductFilter = async (value) => {
  if (!value) return {};

  if (mongoose.Types.ObjectId.isValid(value)) {
    return { product: value };
  }

  const product = await Product.findOne({
    slug: value,
    isDeleted: false,
  }).select("_id");

  return product ? { product: product._id } : { product: null };
};

const isAdminUser = (user) => user?.role === "admin";

const getReviews = async (req, res, next) => {
  try {
    const productFilter = await getProductFilter(
      req.query.product || req.query.productId
    );
    if (productFilter.product === null) {
      return res.status(200).json({
        success: true,
        message: "Reviews fetched successfully",
        reviews: [],
      });
    }

    const admin = isAdminUser(req.user);
    const filter = { ...productFilter };

    if (!admin) {
      filter.isHidden = { $ne: true };
    } else {
      if (req.query.hidden === "true") filter.isHidden = true;
      if (req.query.hidden === "false") filter.isHidden = { $ne: true };
      if (req.query.status) filter.status = req.query.status;
      if (req.query.rating) {
        const rating = Number(req.query.rating);
        if (rating >= 1 && rating <= 5) filter.rating = rating;
      }
      if (req.query.q) {
        const q = String(req.query.q).trim();
        if (q) {
          filter.$or = [
            { customerName: { $regex: q, $options: "i" } },
            { comment: { $regex: q, $options: "i" } },
          ];
        }
      }
    }

    const reviews = await Review.find(filter)
      .populate("product", "name slug price discountPrice")
      .sort({ createdAt: -1 });

    let rating = null;
    if (productFilter.product) {
      rating = await getProductRating(productFilter.product);
    }

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      reviews,
      rating,
    });
  } catch (error) {
    next(error);
  }
};

const postReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: "productId and rating are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required",
      });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const trimmedComment =
      typeof comment === "string" ? comment.trim() : "";

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const review = await Review.create({
      product: product._id,
      user: req.user?._id || null,
      customerName: req.user.name.trim(),
      rating: parsedRating,
      comment: trimmedComment,
      status: "pending",
      isHidden: false,
    });

    const populated = await Review.findById(review._id).populate(
      "product",
      "name slug price discountPrice"
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: populated,
    });
  } catch (error) {
    next(error);
  }
};

const replyReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid review id is required",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.reply = typeof reply === "string" ? reply.trim() : "";
    review.status = review.reply ? "replied" : "pending";
    await review.save();

    const populated = await Review.findById(review._id).populate(
      "product",
      "name slug price discountPrice"
    );

    return res.status(200).json({
      success: true,
      message: "Review reply updated successfully",
      review: populated,
    });
  } catch (error) {
    next(error);
  }
};

const hideReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hidden = req.body?.isHidden !== false;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid review id is required",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.isHidden = Boolean(hidden);
    await review.save();

    const populated = await Review.findById(review._id).populate(
      "product",
      "name slug price discountPrice"
    );

    return res.status(200).json({
      success: true,
      message: review.isHidden ? "Review hidden" : "Review visible again",
      review: populated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid review id is required",
      });
    }

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviews,
  postReview,
  replyReview,
  hideReview,
  deleteReview,
};
