const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    variantName: {
      type: String,
      trim: true,
      default: null,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    weight: {
      type: String,
      trim: true,
      default: null,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedUnitPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    finalUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    itemSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      select: false,
    },
    idempotencyHash: {
      type: String,
      select: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userInfo: {
      type: userInfoSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    promoCode: {
      type: String,
      trim: true,
      default: null,
    },
    promoDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryZone: {
      type: String,
      enum: ["inside-dhaka", "outside-dhaka"],
      default: "inside-dhaka",
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "BKASH", "NAGAD", "CARD", "SSL_COMMERZ"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Partially Refunded", "Refunded"],
      default: "Pending",
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    adminNote: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledReason: {
      type: String,
      trim: true,
      default: null,
    },
    refunds: {
      type: [refundSchema],
      default: [],
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "orders",
  }
);

orderSchema.index({ user: 1 });
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ isDeleted: 1 });

const excludeDeleted = function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }

  next();
};

orderSchema.pre(/^find/, excludeDeleted);
orderSchema.pre(/^update/, excludeDeleted);
orderSchema.pre("countDocuments", excludeDeleted);

orderSchema.pre("aggregate", function (next) {
  if (!this.options.withDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  }

  next();
});

const preventHardDelete = function (next) {
  if (this.getOptions().hardDelete) {
    return next();
  }

  const error = new Error("Hard delete is disabled for Order. Use soft delete instead.");
  error.statusCode = 400;
  next(error);
};

orderSchema.pre("deleteOne", { query: true, document: false }, preventHardDelete);
orderSchema.pre("deleteMany", preventHardDelete);
orderSchema.pre("findOneAndDelete", preventHardDelete);

module.exports = mongoose.model("Order", orderSchema);
