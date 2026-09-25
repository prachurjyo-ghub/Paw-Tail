const mongoose = require("mongoose");
const { mediaField } = require("./media");

const animalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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

animalSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

const excludeDeleted = function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }

  next();
};

animalSchema.pre(/^find/, excludeDeleted);
animalSchema.pre(/^update/, excludeDeleted);
animalSchema.pre("countDocuments", excludeDeleted);

animalSchema.pre("aggregate", function (next) {
  if (!this.options.withDeleted) {
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  }

  next();
});

const preventHardDelete = function (next) {
  if (this.getOptions().hardDelete) {
    return next();
  }

  const error = new Error("Hard delete is disabled for Animal. Use soft delete instead.");
  error.statusCode = 400;
  next(error);
};

animalSchema.pre("deleteOne", { query: true, document: false }, preventHardDelete);
animalSchema.pre("deleteMany", preventHardDelete);
animalSchema.pre("findOneAndDelete", preventHardDelete);

module.exports = mongoose.model("Animal", animalSchema);
