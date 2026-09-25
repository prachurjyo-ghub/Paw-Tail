const Category = require("../../models/Category");
const Product = require("../../models/Product");
const { mediaService } = require("../../services/mediaService");
const { cleanupOldMedia } = require("../../utils/media");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCategories = async (req, res, next) => {
  try {
    const includeInactive = ["1", "true", "yes"].includes(
      String(req.query.includeInactive || "").toLowerCase()
    );
    const filter = includeInactive ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      categories,
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  let uploadedImage = null;
  let databaseSaved = false;

  try {
    const { name, animalName, icon } = req.body;
    const trimmedName = name?.trim();
    const trimmedAnimalName = animalName?.trim();

    if (!trimmedName || !trimmedAnimalName) {
      return res.status(400).json({
        success: false,
        message: "Name and animalName are required",
      });
    }

    const existingCategory = await Category.findOne({
      name: {
        $regex: `^${escapeRegex(trimmedName)}$`,
        $options: "i",
      },
      isDeleted: { $ne: true },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    if (req.file) {
      uploadedImage = await mediaService.uploadImage(req.file, "categories");
    }

    const category = await Category.create({
      name: trimmedName,
      animalName: trimmedAnimalName,
      icon: String(icon || "🐾").trim() || "🐾",
      image: uploadedImage,
    });
    databaseSaved = true;

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (uploadedImage && !databaseSaved) {
      await mediaService
        .destroyMedia(uploadedImage, {
          requestId: req.requestId,
          resource: "categories",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const updateCategoryBySlug = async (req, res, next) => {
  let newImage = null;
  let databaseSaved = false;

  try {
    const { slug } = req.params;
    const { name, animalName, image, icon } = req.body;
    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name) {
      const existingCategory = await Category.findOne({
        name: {
          $regex: `^${escapeRegex(name.trim())}$`,
          $options: "i",
        },
        _id: { $ne: category._id },
        isDeleted: { $ne: true },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name.trim();
    }

    if (animalName) {
      category.animalName = animalName.trim();
    }

    if (typeof icon === "string") {
      category.icon = icon.trim() || "🐾";
    }

    const previousImage = category.image;
    if (req.file) {
      newImage = await mediaService.uploadImage(req.file, "categories");
      category.image = newImage;
    } else if (image === "") {
      category.image = null;
    }

    await category.save();
    databaseSaved = true;

    if ((newImage || image === "") && previousImage) {
      await cleanupOldMedia([previousImage], {
        legacyFolder: "categories",
        requestId: req.requestId,
        resource: "categories",
        entityId: category._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (newImage && !databaseSaved) {
      await mediaService
        .destroyMedia(newImage, {
          requestId: req.requestId,
          resource: "categories",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const deleteCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const linkedProductCount = await Product.countDocuments({
      category: category._id,
      isDeleted: false,
    });

    if (linkedProductCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category while products are assigned to it",
      });
    }

    category.isDeleted = true;
    category.isActive = false;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
};

const toggleCategoryActiveBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive boolean is required",
      });
    }

    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = isActive;
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category ${isActive ? "activated" : "deactivated"} successfully`,
      category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategoryBySlug,
  deleteCategoryBySlug,
  toggleCategoryActiveBySlug,
};
