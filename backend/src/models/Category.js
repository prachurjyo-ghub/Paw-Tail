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

const categorySchema = new mongoose.Schema(
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

    animalName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    icon: {
      type: String,
      default: "🐾",
      trim: true,
    },

    image: mediaField(),

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Auto generate unique slug
categorySchema.pre("validate", async function (next) {
  try {
    if (!this.name) return next();

    // Prevent unnecessary slug regeneration
    if (!this.isNew && !this.isModified("name") && this.slug) {
      return next();
    }

    const Category = this.constructor;

    const baseSlug = slugify(this.name) || "category";

    let candidate = baseSlug;
    let counter = 1;

    while (
      await Category.exists({
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

categorySchema.pre(/^find/, excludeDeleted);
categorySchema.pre(/^update/, excludeDeleted);
categorySchema.pre("countDocuments", excludeDeleted);

categorySchema.pre("aggregate", function (next) {
  if (!this.options.withDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  }

  next();
});

const preventHardDelete = function (next) {
  if (this.getOptions().hardDelete) {
    return next();
  }

  const error = new Error("Hard delete is disabled for Category. Use soft delete instead.");
  error.statusCode = 400;
  next(error);
};

categorySchema.pre("deleteOne", { query: true, document: false }, preventHardDelete);
categorySchema.pre("deleteMany", preventHardDelete);
categorySchema.pre("findOneAndDelete", preventHardDelete);

module.exports = mongoose.model("Category", categorySchema);
