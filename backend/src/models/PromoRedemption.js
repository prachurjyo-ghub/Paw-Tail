const mongoose = require("mongoose");

const promoRedemptionSchema = new mongoose.Schema(
  {
    promo: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, min: 0, default: 0 },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

promoRedemptionSchema.index({ promo: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("PromoRedemption", promoRedemptionSchema);
