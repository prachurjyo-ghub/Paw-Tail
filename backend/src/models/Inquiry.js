const mongoose = require("mongoose");

const INQUIRY_TOPICS = [
  "Order & delivery",
  "Nutrition advice",
  "Product question",
  "Visit a store",
  "Returns & refunds",
  "Wholesale / bulk",
];

const inquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    pet: { type: String, required: true, trim: true },
    topic: {
      type: String,
      required: true,
      enum: INQUIRY_TOPICS,
    },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["need_contact", "contacted"],
      default: "need_contact",
      index: true,
    },
    adminReply: {
      type: String,
      default: "",
      trim: true,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

inquirySchema.index({ topic: 1, status: 1, createdAt: -1 });

inquirySchema.statics.TOPICS = INQUIRY_TOPICS;

module.exports = mongoose.model("Inquiry", inquirySchema);
