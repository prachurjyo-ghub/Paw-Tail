const mongoose = require("mongoose");
const { mediaField } = require("./media");

const bannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    bannerType: {
      type: String,
      enum: ["hero-banner", "promo-banner", "slider-banner"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    slideNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    imageUrl: mediaField({ required: true }),
    linkUrl: {
      type: String,
      trim: true,
      default: null,
    },
    altText: {
      type: String,
      trim: true,
      default: null,
    },
    targetPages: {
      type: [String],
      default: [],
    },
    showCatalogHeader: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ bannerType: 1, isActive: 1, slideNumber: 1 });
bannerSchema.index({ bannerType: 1, isActive: 1, targetPages: 1 });

module.exports = mongoose.model("Banner", bannerSchema);
