const mongoose = require("mongoose");

const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const {
  getDeliveryCharge,
  getDeliveryZoneSettings,
  roundMoney,
} = require("../../services/deliveryZoneService");

let PromoCode = null;

try {
  PromoCode = require("../../models/PromoCode");
} catch (_error) {
  PromoCode = null;
}

const sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

const findVariant = (product, variantId) => {
  if (!variantId) {
    return null;
  }

  return (product.variants || []).find((variant) => {
    return variant._id?.toString() === variantId.toString();
  });
};

const productHasVariants = (product) => {
  return Array.isArray(product.variants) && product.variants.length > 0;
};

const getProductImage = (product) => {
  return Array.isArray(product.images) && product.images.length ? product.images[0] : null;
};

const getFinalUnitPrice = (product, variant) => {
  if (variant) {
    return Number(product.price || 0) + Number(variant.priceAdjustment || 0);
  }

  const basePrice =
    typeof product.discountPrice === "number" ? product.discountPrice : product.price;

  return Number(basePrice || 0);
};

const getStockQuantity = (product, variant) => {
  if (variant) {
    return Number(variant.stockQuantity || 0);
  }

  return Number(product.stockQuantity || 0);
};

const formatCart = async (cart) => {
  await cart.populate({
    path: "items.product",
    select:
      "name slug images price discountPrice stockQuantity isOutOfStock isActive isDeleted variants",
  });

  const items = cart.items
    .filter((item) => item.product && !item.product.isDeleted)
    .map((item) => {
      const product = item.product;
      const variant = findVariant(product, item.variantId);
      const finalUnitPrice = getFinalUnitPrice(product, variant);
      const stockQuantity = getStockQuantity(product, variant);
      const isAvailable =
        product.isActive &&
        !product.isOutOfStock &&
        stockQuantity > 0 &&
        (!item.variantId || variant?.isActive !== false);

      return {
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          image: getProductImage(product),
          price: product.price,
          discountPrice: product.discountPrice,
        },
        variant: variant
          ? {
              _id: variant._id,
              name: variant.name,
              value: variant.value,
              sku: variant.sku,
              priceAdjustment: variant.priceAdjustment,
            }
          : null,
        quantity: item.quantity,
        stockQuantity,
        isAvailable,
        finalUnitPrice,
        itemSubtotal: finalUnitPrice * item.quantity,
      };
    });

  const subtotal = items.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart: {
      _id: cart._id,
      user: cart.user,
      items,
      itemCount,
      subtotal,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    },
  };
};

const findPromoCode = async (promoCode) => {
  if (!PromoCode || !promoCode?.trim()) {
    return null;
  }

  return PromoCode.findOne({
    nameNormalized: promoCode.trim().toLowerCase(),
  });
};

const calculateVoucherDiscount = async ({ promoCode, subtotal, user }) => {
  if (!promoCode?.trim()) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: null,
    };
  }

  const promo = await findPromoCode(promoCode);

  if (!promo) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "Voucher is not available",
    };
  }

  const now = new Date();

  if (!promo.isActive) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "Voucher is inactive",
    };
  }

  if (promo.startDate > now) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "Voucher has not started yet",
    };
  }

  if (promo.expiryDate < now) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "Voucher has expired",
    };
  }

  if (subtotal < promo.minOrder) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: `Minimum order amount is ${promo.minOrder}`,
    };
  }

  if (promo.totalUsageLimit && promo.usageCount >= promo.totalUsageLimit) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "Voucher usage limit reached",
    };
  }

  const userUsage = (promo.usageRecords || []).find((record) => {
    return record.user?.toString() === user._id.toString();
  });

  if ((userUsage?.count || 0) >= promo.usageLimitPerUser) {
    return {
      appliedPromoCode: null,
      voucherDiscount: 0,
      voucherMessage: "You have reached the usage limit for this voucher",
    };
  }

  const rawDiscount =
    promo.discountType === "percentage"
      ? (subtotal * promo.discountValue) / 100
      : promo.discountValue;
  const cappedDiscount =
    promo.maxAmount === null || promo.maxAmount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, promo.maxAmount);
  const voucherDiscount = Math.min(subtotal, cappedDiscount);

  return {
    appliedPromoCode: promo.name,
    voucherDiscount: roundMoney(voucherDiscount),
    voucherMessage: "Voucher applied",
  };
};

const buildCartSummary = async ({ cart, promoCode, deliveryZone, user }) => {
  const { cart: formattedCart } = await formatCart(cart);
  const itemsSubtotal = roundMoney(formattedCart.subtotal);
  const voucher = await calculateVoucherDiscount({
    promoCode,
    subtotal: itemsSubtotal,
    user,
  });
  const discountedSubtotal = roundMoney(
    Math.max(0, itemsSubtotal - voucher.voucherDiscount)
  );
  const deliverySettings = await getDeliveryZoneSettings();
  const delivery = getDeliveryCharge(
    deliveryZone,
    discountedSubtotal,
    deliverySettings
  );
  const grandTotal = roundMoney(discountedSubtotal + delivery.deliveryCharge);

  return {
    cart: formattedCart,
    summary: {
      itemsSubtotal,
      appliedPromoCode: voucher.appliedPromoCode,
      voucherDiscount: voucher.voucherDiscount,
      voucherMessage: voucher.voucherMessage,
      discountedSubtotal,
      deliveryZone: delivery.deliveryZone,
      deliveryCharge: delivery.deliveryCharge,
      freeDeliveryThreshold: delivery.freeDeliveryThreshold,
      grandTotal,
    },
  };
};

const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const formattedCart = await formatCart(cart);

    return sendSuccess(res, 200, "Cart fetched successfully", formattedCart);
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, variantId = null } = req.body;
    const quantity = Number(req.body.quantity || 1);

    if (!isValidObjectId(productId)) {
      return sendError(res, 400, "Valid product id is required");
    }

    if (variantId && !isValidObjectId(variantId)) {
      return sendError(res, 400, "Valid variant id is required");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return sendError(res, 400, "Quantity must be at least 1");
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    const hasVariants = productHasVariants(product);
    const variant = findVariant(product, variantId);

    if (!hasVariants && variantId) {
      return sendError(res, 400, "This product does not have variants");
    }

    if (variantId && !variant) {
      return sendError(res, 404, "Product variant not found");
    }

    if (variant?.isActive === false) {
      return sendError(res, 400, "Product variant is not active");
    }

    const stockQuantity = getStockQuantity(product, variant);

    if (product.isOutOfStock || stockQuantity < quantity) {
      return sendError(res, 400, "Insufficient product stock");
    }

    const cart = await getOrCreateCart(req.user._id);
    const existingItem = cart.items.find((item) => {
      return (
        item.product.toString() === productId.toString() &&
        (item.variantId?.toString() || null) === (variantId?.toString() || null)
      );
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + quantity;

      if (nextQuantity > stockQuantity) {
        return sendError(res, 400, "Insufficient product stock");
      }

      existingItem.quantity = nextQuantity;
    } else {
      cart.items.push({
        product: product._id,
        variantId: variantId || null,
        quantity,
      });
    }

    await cart.save();
    const formattedCart = await formatCart(cart);

    return sendSuccess(res, 200, "Product added to cart", formattedCart);
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!isValidObjectId(itemId)) {
      return sendError(res, 400, "Valid cart item id is required");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return sendError(res, 400, "Quantity must be at least 1");
    }

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(itemId);

    if (!item) {
      return sendError(res, 404, "Cart item not found");
    }

    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    const variant = findVariant(product, item.variantId);
    const stockQuantity = getStockQuantity(product, variant);

    if (quantity > stockQuantity) {
      return sendError(res, 400, "Insufficient product stock");
    }

    item.quantity = quantity;
    await cart.save();
    const formattedCart = await formatCart(cart);

    return sendSuccess(res, 200, "Cart item updated successfully", formattedCart);
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return sendError(res, 400, "Valid cart item id is required");
    }

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(itemId);

    if (!item) {
      return sendError(res, 404, "Cart item not found");
    }

    item.deleteOne();
    await cart.save();
    const formattedCart = await formatCart(cart);

    return sendSuccess(res, 200, "Cart item removed successfully", formattedCart);
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    const formattedCart = await formatCart(cart);

    return sendSuccess(res, 200, "Cart cleared successfully", formattedCart);
  } catch (error) {
    next(error);
  }
};

const calculateCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const { promoCode = "", deliveryZone = "inside-dhaka" } = req.body;
    const calculatedCart = await buildCartSummary({
      cart,
      promoCode,
      deliveryZone,
      user: req.user,
    });

    return sendSuccess(res, 200, "Cart calculated successfully", calculatedCart);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  calculateCart,
};
