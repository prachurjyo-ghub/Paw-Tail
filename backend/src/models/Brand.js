const mongoose = require("mongoose");
const { mediaField } = require("./media");

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    animalNames: [
      {
        type: String,
        trim: true,
      },
    ],
    image: mediaField(),
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "brands",
  }
);

brandSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

brandSchema.pre("validate", async function (next) {
  try {
    if (!this.name) return next();

    if (!this.isNew && !this.isModified("name") && this.slug) {
      return next();
    }

    const Brand = this.constructor;
    const baseSlug = slugify(this.name) || "brand";
    let candidate = baseSlug;
    let counter = 1;

    while (
      await Brand.exists({
        slug: candidate,
        _id: { $ne: this._id },
        isDeleted: { $ne: true },
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

const excludeDeleted = function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }

  next();
};

brandSchema.pre(/^find/, excludeDeleted);
brandSchema.pre(/^update/, excludeDeleted);
brandSchema.pre("countDocuments", excludeDeleted);

brandSchema.pre("aggregate", function (next) {
  if (!this.options.withDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  }

  next();
});

const preventHardDelete = function (next) {
  if (this.getOptions().hardDelete) {
    return next();
  }

  const error = new Error("Hard delete is disabled for Brand. Use soft delete instead.");
  error.statusCode = 400;
  next(error);
};

brandSchema.pre("deleteOne", { query: true, document: false }, preventHardDelete);
brandSchema.pre("deleteMany", preventHardDelete);
brandSchema.pre("findOneAndDelete", preventHardDelete);

module.exports = mongoose.model("Brand", brandSchema);
