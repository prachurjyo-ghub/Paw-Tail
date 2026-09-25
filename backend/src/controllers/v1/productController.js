const mongoose = require("mongoose");

const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Animal = require("../../models/Animal");
const Brand = require("../../models/Brand");
const {
  mediaService,
  persistUploadedMedia,
} = require("../../services/mediaService");
const {
  cleanupOldMedia,
  isSameMedia,
  selectOwnedMedia,
} = require("../../utils/media");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const normalizeStringArray = (value) => {
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

const normalizeVariants = (value) => {
  let variants = value;

  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (_error) {
      return null;
    }
  }

  if (!Array.isArray(variants)) return [];

  return variants
    .map((variant) => {
      const value = variant?.value || variant?.label || null;
      if (!value) return null;

      return {
        ...(mongoose.Types.ObjectId.isValid(variant?._id)
          ? { _id: variant._id }
          : {}),
        name: variant?.name || "Size",
        value,
        sku: variant?.sku || null,
        priceAdjustment:
          typeof variant?.priceAdjustment === "number"
            ? variant.priceAdjustment
            : Number(variant?.priceAdjustment || 0),
        stockQuantity:
          typeof variant?.stockQuantity === "number"
            ? variant.stockQuantity
            : Number(variant?.stockQuantity || 0),
        isActive:
          typeof variant?.isActive === "boolean"
            ? variant.isActive
            : parseBoolean(variant?.isActive) ?? true,
      };
    })
    .filter(Boolean);
};

const validateObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveCategoryRef = async (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "string" && !value.trim()) return null;

  if (validateObjectId(value)) {
    return Category.findById(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    const bySlug = await Category.findOne({ slug: trimmedValue.toLowerCase() });
    if (bySlug) return bySlug;

    return Category.findOne({
      name: { $regex: `^${escapeRegex(trimmedValue)}$`, $options: "i" },
    });
  }

  return null;
};

const resolveBrandRef = async (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "string" && !value.trim()) return null;

  if (validateObjectId(value)) {
    return Brand.findById(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    const bySlug = await Brand.findOne({ slug: trimmedValue.toLowerCase() });
    if (bySlug) return bySlug;

    return Brand.findOne({
      name: { $regex: `^${escapeRegex(trimmedValue)}$`, $options: "i" },
    });
  }

  return null;
};

const resolveAnimalRef = async (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "string" && !value.trim()) return null;

  if (validateObjectId(value)) {
    return Animal.findById(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    const bySlug = await Animal.findOne({ slug: trimmedValue.toLowerCase() });
    if (bySlug) return bySlug;

    return Animal.findOne({
      name: { $regex: `^${escapeRegex(trimmedValue)}$`, $options: "i" },
    });
  }

  return null;
};

const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      animal,
      category,
      brand,
      minPrice,
      maxPrice,
      isActive,
      stockStatus,
      isOfferEnabled,
      isFeatured,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      isDeleted: false,
    };

    if (search) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    if (category) {
      const matchedCategory = await resolveCategoryRef(category);
      query.category = matchedCategory?._id || null;
    }

    if (animal) {
      const matchedAnimal = await resolveAnimalRef(animal);
      query.animal = matchedAnimal?._id || null;
    }

    if (brand) {
      const matchedBrand = await resolveBrandRef(brand);
      query.brand = matchedBrand?._id || null;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const activeFilter = parseBoolean(isActive);
    if (typeof activeFilter === "boolean") {
      query.isActive = activeFilter;
    }

    const offerFilter = parseBoolean(isOfferEnabled);
    if (typeof offerFilter === "boolean") {
      query.isOfferEnabled = offerFilter;
    }

    const featuredFilter = parseBoolean(isFeatured);
    if (typeof featuredFilter === "boolean") {
      query.isFeatured = featuredFilter;
    }

    if (typeof stockStatus === "string") {
      if (stockStatus === "in-stock") {
        query.isOutOfStock = false;
      } else if (stockStatus === "out-of-stock") {
        query.isOutOfStock = true;
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price-asc") {
      sortOption = { price: 1, createdAt: -1 };
    } else if (sort === "price-desc") {
      sortOption = { price: -1, createdAt: -1 };
    }

    const sanitizedPage = Math.max(1, Number(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const [rawProducts, totalProducts] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .populate("animal", "name slug")
        .populate("brand", "name slug")
        .sort(sortOption)
        .skip(skip)
        .limit(sanitizedLimit),
      Product.countDocuments(query),
    ]);

    const { attachRatingsToProducts } = require("../../utils/reviewRatings");
    const products = await attachRatingsToProducts(rawProducts);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / sanitizedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDeletedProducts = async (req, res, next) => {
  try {
    const {
      search,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      isDeleted: true,
    };

    if (search) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    let sortOption = { deletedAt: -1, createdAt: -1 };
    if (sort === "price-asc") {
      sortOption = { price: 1, deletedAt: -1 };
    } else if (sort === "price-desc") {
      sortOption = { price: -1, deletedAt: -1 };
    }

    const sanitizedPage = Math.max(1, Number(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .populate("brand", "name slug")
        .populate("deletedBy", "name email role")
        .sort(sortOption)
        .skip(skip)
        .limit(sanitizedLimit),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Deleted products fetched successfully",
      products,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / sanitizedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSingleProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const includeInactive = ["1", "true", "yes"].includes(
      String(req.query.includeInactive || "").toLowerCase()
    );

    const product = await Product.findOne({
      slug,
      isDeleted: false,
      ...(includeInactive ? {} : { isActive: true }),
    })
      .populate("category", "name slug")
      .populate("animal", "name slug")
      .populate("brand", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const relatedProductsRaw = await Product.find({
      _id: { $ne: product._id },
      category: product.category?._id || product.category,
      isDeleted: false,
      isActive: true,
    })
      .select("name slug images price discountPrice isOutOfStock")
      .sort({ createdAt: -1 })
      .limit(4);

    const { attachRatingsToProducts, getProductRating } = require("../../utils/reviewRatings");
    const rating = await getProductRating(product._id);
    const relatedProducts = await attachRatingsToProducts(relatedProductsRaw);
    const productWithRating = {
      ...(product.toObject ? product.toObject() : product),
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      isBaselineRating: rating.isBaseline,
    };

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product: productWithRating,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  let uploadedImages = [];
  let databaseSaved = false;

  try {
    const {
      name,
      description,
      animal,
      category,
      brand,
      price,
      discountPrice,
      stockQuantity,
      isActive,
      isFeatured,
      isOfferEnabled,
      tags,
      variants,
    } = req.body;

    if (!name || !description || !category || !brand || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, description, category, brand, and price are required",
      });
    }

    if (stockQuantity === undefined || Number(stockQuantity) < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid stockQuantity is required",
      });
    }

    const resolvedCategory = await resolveCategoryRef(category);
    if (!resolvedCategory) {
      return res.status(400).json({
        success: false,
        message: "Valid category (id, slug, or name) is required",
      });
    }

    const resolvedAnimal = await resolveAnimalRef(animal);

    const resolvedBrand = await resolveBrandRef(brand);
    if (!resolvedBrand) {
      return res.status(400).json({
        success: false,
        message: "Valid brand (id, slug, or name) is required",
      });
    }

    const existingProductByName = await Product.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      isDeleted: false,
    });

    if (existingProductByName) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    const normalizedVariants = normalizeVariants(variants);
    if (normalizedVariants === null) {
      return res.status(400).json({
        success: false,
        message: "variants must be a valid JSON array",
      });
    }

    const parsedPrice = Number(price);
    const parsedDiscountPrice =
      discountPrice === undefined || discountPrice === null || discountPrice === ""
        ? null
        : Number(discountPrice);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    if (
      parsedDiscountPrice !== null &&
      (!Number.isFinite(parsedDiscountPrice) ||
        parsedDiscountPrice < 0 ||
        parsedDiscountPrice >= parsedPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "discountPrice must be lower than price",
      });
    }

    const creation = await persistUploadedMedia({
      files: req.files || [],
      resource: "products",
      context: { requestId: req.requestId },
      persist: (nextImages) =>
        Product.create({
          name,
          description,
          category: resolvedCategory._id,
          animal: resolvedAnimal?._id || null,
          brand: resolvedBrand._id,
          price: parsedPrice,
          discountPrice: parsedDiscountPrice,
          stockQuantity: Number(stockQuantity),
          isActive: parseBoolean(isActive) ?? true,
          isFeatured: parseBoolean(isFeatured) ?? false,
          isOfferEnabled: parseBoolean(isOfferEnabled) ?? false,
          tags: normalizeStringArray(tags),
          images: nextImages,
          variants: normalizedVariants,
        }),
    });
    uploadedImages = creation.uploaded;
    const product = creation.value;
    databaseSaved = true;

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("brand", "name slug");

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populatedProduct,
    });
  } catch (error) {
    if (!databaseSaved) {
      await mediaService
        .destroyMany(uploadedImages, {
          requestId: req.requestId,
          resource: "products",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  let uploadedImages = [];
  let databaseSaved = false;

  try {
    const { slug } = req.params;
    const {
      name,
      description,
      animal,
      category,
      brand,
      price,
      discountPrice,
      stockQuantity,
      isActive,
      isFeatured,
      isOfferEnabled,
      tags,
      images,
      existingImages,
      variants,
    } = req.body;

    const product = await Product.findOne({
      slug,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (name && name.trim().toLowerCase() !== product.name.toLowerCase()) {
      const existingProductByName = await Product.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: product._id },
        isDeleted: false,
      });

      if (existingProductByName) {
        return res.status(400).json({
          success: false,
          message: "Product with this name already exists",
        });
      }

      product.name = name;
    }

    if (description) product.description = description;

    if (category !== undefined) {
      const resolvedCategory = await resolveCategoryRef(category);
      if (!resolvedCategory) {
        return res.status(400).json({
          success: false,
          message: "Valid category (id, slug, or name) is required",
        });
      }

      product.category = resolvedCategory._id;
    }

    if (animal !== undefined) {
      const resolvedAnimal = await resolveAnimalRef(animal);
      if (animal && !resolvedAnimal) {
        return res.status(400).json({
          success: false,
          message: "Valid animal (id, slug, or name) is required",
        });
      }

      product.animal = resolvedAnimal?._id || null;
    }

    if (brand !== undefined) {
      const resolvedBrand = await resolveBrandRef(brand);
      if (!resolvedBrand) {
        return res.status(400).json({
          success: false,
          message: "Valid brand (id, slug, or name) is required",
        });
      }

      product.brand = resolvedBrand._id;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid price is required",
        });
      }
      product.price = parsedPrice;
    }

    if (discountPrice !== undefined) {
      if (discountPrice === null || discountPrice === "") {
        product.discountPrice = null;
      } else {
        const parsedDiscountPrice = Number(discountPrice);
        if (
          !Number.isFinite(parsedDiscountPrice) ||
          parsedDiscountPrice < 0 ||
          parsedDiscountPrice >= product.price
        ) {
          return res.status(400).json({
            success: false,
            message: "discountPrice must be lower than price",
          });
        }

        product.discountPrice = parsedDiscountPrice;
      }
    }

    if (stockQuantity !== undefined) {
      const parsedStock = Number(stockQuantity);
      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid stockQuantity is required",
        });
      }
      product.stockQuantity = parsedStock;
    }

    const parsedIsActive = parseBoolean(isActive);
    if (typeof parsedIsActive === "boolean") {
      product.isActive = parsedIsActive;
    }

    const parsedIsFeatured = parseBoolean(isFeatured);
    if (typeof parsedIsFeatured === "boolean") {
      product.isFeatured = parsedIsFeatured;
    }

    const parsedOfferEnabled = parseBoolean(isOfferEnabled);
    if (typeof parsedOfferEnabled === "boolean") {
      product.isOfferEnabled = parsedOfferEnabled;
      if (!parsedOfferEnabled) {
        product.discountPrice = null;
      }
    }

    if (tags !== undefined) {
      product.tags = normalizeStringArray(tags);
    }

    if (variants !== undefined) {
      const normalizedVariants = normalizeVariants(variants);
      if (normalizedVariants === null) {
        return res.status(400).json({
          success: false,
          message: "variants must be a valid JSON array",
        });
      }
      product.variants = normalizedVariants;
    }

    let removedImages = [];
    if (
      images !== undefined ||
      existingImages !== undefined ||
      req.files?.length
    ) {
      const currentImages = [...(product.images || [])];
      const requestedTokens =
        existingImages !== undefined ? existingImages : images;
      const retainedImages =
        requestedTokens !== undefined
          ? selectOwnedMedia(currentImages, requestedTokens)
          : currentImages;

      uploadedImages = await mediaService.uploadMany(
        req.files || [],
        "products",
        {
          requestId: req.requestId,
          entityId: product._id,
        }
      );

      const nextImages = [...retainedImages, ...uploadedImages];
      removedImages = currentImages.filter(
        (currentImage) =>
          !retainedImages.some((retainedImage) =>
            isSameMedia(currentImage, retainedImage)
          )
      );
      product.images = nextImages;
    }

    await product.save();
    databaseSaved = true;

    await cleanupOldMedia(removedImages, {
      legacyFolder: "products",
      requestId: req.requestId,
      resource: "products",
      entityId: product._id,
    });

    const updatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("animal", "name slug")
      .populate("brand", "name slug");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    if (!databaseSaved) {
      await mediaService
        .destroyMany(uploadedImages, {
          requestId: req.requestId,
          resource: "products",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.deletedBy = req.user?._id || null;
    product.isActive = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getDeletedProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
