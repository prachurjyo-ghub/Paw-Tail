const mongoose = require("mongoose");
const { isMediaValue } = require("./media");

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const productVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: null,
  },
  value: {
    type: String,
    trim: true,
    default: null,
  },
  sku: {
    type: String,
    trim: true,
    default: null,
  },
  priceAdjustment: {
    type: Number,
    default: 0,
    min: 0,
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    images: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: {
        validator: (images) => images.every(isMediaValue),
        message:
          "Each product image must be a legacy path or valid Cloudinary metadata",
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Animal",
      default: null,
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isOutOfStock: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isOfferEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    variants: [productVariantSchema],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
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
  }
);

productSchema.pre("validate", async function (next) {
  try {
    if (!this.name) return next();

    if (!this.isNew && !this.isModified("name") && this.slug) {
      return next();
    }

    const Product = this.constructor;
    const baseSlug = slugify(this.name) || "product";
    let candidate = baseSlug;
    let counter = 1;

    while (
      await Product.exists({
        slug: candidate,
        _id: { $ne: this._id },
      })
    ) {
      candidate = `${baseSlug}-${counter++}`;
    }

    this.slug = candidate;
    next();
  } catch (error) {
    next(error);
  }
});

productSchema.pre("save", function (next) {
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    const totalVariantStock = this.variants.reduce(
      (total, variant) => total + Number(variant.stockQuantity || 0),
      0
    );
    this.isOutOfStock = Number(this.stockQuantity || 0) + totalVariantStock <= 0;
  } else if (typeof this.stockQuantity === "number") {
    this.isOutOfStock = this.stockQuantity <= 0;
  }

  if (
    typeof this.price === "number" &&
    typeof this.discountPrice === "number" &&
    this.discountPrice >= 0 &&
    this.discountPrice < this.price
  ) {
    this.discountPercentage = Number(
      (((this.price - this.discountPrice) / this.price) * 100).toFixed(2)
    );
    this.isOfferEnabled = true;
  } else {
    this.discountPrice = null;
    this.discountPercentage = 0;
    this.isOfferEnabled = false;
  }

  next();
});

productSchema.methods.canFulfill = function (quantity = 1) {
  return (
    !this.isDeleted &&
    this.isActive &&
    !this.isOutOfStock &&
    this.stockQuantity >= quantity
  );
};

module.exports = mongoose.model("Product", productSchema);
