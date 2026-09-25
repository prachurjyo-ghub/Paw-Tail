const Brand = require("../../models/Brand");
const { mediaService } = require("../../services/mediaService");
const { cleanupOldMedia } = require("../../utils/media");

const normalizeAnimalNames = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getBrands = async (req, res, next) => {
  try {
    const includeInactive = ["1", "true", "yes"].includes(
      String(req.query.includeInactive || "").toLowerCase()
    );
    const filter = includeInactive ? {} : { isActive: true };

    const brands = await Brand.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Brands fetched successfully",
      brands,
    });
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req, res, next) => {
  let uploadedImage = null;
  let databaseSaved = false;

  try {
    const { name, animalNames } = req.body;
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const existingBrand = await Brand.findOne({
      name: {
        $regex: `^${trimmedName}$`,
        $options: "i",
      },
      isDeleted: { $ne: true },
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand already exists",
      });
    }

    if (req.file) {
      uploadedImage = await mediaService.uploadImage(req.file, "brands");
    }

    const brand = await Brand.create({
      name: trimmedName,
      animalNames: normalizeAnimalNames(animalNames),
      image: uploadedImage,
    });
    databaseSaved = true;

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    if (uploadedImage && !databaseSaved) {
      await mediaService
        .destroyMedia(uploadedImage, {
          requestId: req.requestId,
          resource: "brands",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const updateBrandBySlug = async (req, res, next) => {
  let newImage = null;
  let databaseSaved = false;

  try {
    const { slug } = req.params;
    const { name, animalNames } = req.body;

    const brand = await Brand.findOne({ slug });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (name && name.trim().toLowerCase() !== brand.name.toLowerCase()) {
      const existingBrand = await Brand.findOne({
        name: {
          $regex: `^${name.trim()}$`,
          $options: "i",
        },
        _id: { $ne: brand._id },
        isDeleted: { $ne: true },
      });

      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand already exists",
        });
      }

      brand.name = name.trim();
    }

    if (animalNames !== undefined) {
      brand.animalNames = normalizeAnimalNames(animalNames);
    }

    const previousImage = brand.image;
    if (req.file) {
      newImage = await mediaService.uploadImage(req.file, "brands");
      brand.image = newImage;
    }

    await brand.save();
    databaseSaved = true;

    if (newImage && previousImage) {
      await cleanupOldMedia([previousImage], {
        legacyFolder: "brands",
        requestId: req.requestId,
        resource: "brands",
        entityId: brand._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    if (newImage && !databaseSaved) {
      await mediaService
        .destroyMedia(newImage, {
          requestId: req.requestId,
          resource: "brands",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const deleteBrandBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isDeleted = true;
    brand.isActive = false;
    brand.deletedAt = new Date();
    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
      brand,
    });
  } catch (error) {
    next(error);
  }
};

const toggleBrandActiveBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive boolean is required",
      });
    }

    const brand = await Brand.findOne({ slug });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isActive = isActive;
    await brand.save();

    return res.status(200).json({
      success: true,
      message: `Brand ${isActive ? "activated" : "deactivated"} successfully`,
      brand,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrands,
  createBrand,
  updateBrandBySlug,
  deleteBrandBySlug,
  toggleBrandActiveBySlug,
};
