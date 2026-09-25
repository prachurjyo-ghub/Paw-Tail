const mongoose = require("mongoose");

const Order = require("../../models/Order");
const PromoCode = require("../../models/PromoCode");
const {
  getDeliveryCharge,
  getDeliveryZoneSettings,
} = require("../../services/deliveryZoneService");
const { getMediaUrl } = require("../../models/media");

const sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isAdmin = (user) => {
  return user?.role === "admin";
};

const getProductModel = () => {
  return require("../../models/Product");
};

const toObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};

const idsMatch = (left, right) => {
  return left?.toString() === right?.toString();
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getFirstNumber = (...values) => {
  for (const value of values) {
    const number = normalizeNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
};

const getFirstValue = (...values) => {
  return values.find((value) => value !== undefined && value !== null && value !== "");
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const findVariant = (product, variantId) => {
  if (!variantId) {
    return null;
  }

  const variants = getProductVariants(product);

  return variants.find((variant) => {
    return (
      idsMatch(variant._id, variantId) ||
      idsMatch(variant.id, variantId) ||
      idsMatch(variant.variantId, variantId)
    );
  });
};

const getProductVariants = (product) => {
  return product.variants || product.productVariants || [];
};

const productHasVariants = (product) => {
  return getProductVariants(product).length > 0;
};

const getProductImage = (product, variant) => {
  const image = getFirstValue(
    variant?.image,
    variant?.thumbnail,
    Array.isArray(variant?.images) ? variant.images[0] : undefined,
    product.image,
    product.thumbnail,
    Array.isArray(product.images) ? product.images[0] : undefined
  );

  return getMediaUrl(image) || image?.toString() || "";
};

const getProductName = (product) => {
  return getFirstValue(product.name, product.title, product.productName)?.toString() || "";
};

const getVariantName = (variant) => {
  return getFirstValue(variant?.name, variant?.title, variant?.variantName)?.toString() || null;
};

const getVariantAdjustedPrice = (product, variant) => {
  if (!variant) {
    return null;
  }

  const basePrice = getFirstNumber(product.price, product.unitPrice, product.basePrice);
  const priceAdjustment = getFirstNumber(variant.priceAdjustment, 0);

  if (basePrice === null || priceAdjustment === null) {
    return null;
  }

  return basePrice + priceAdjustment;
};

const getPricingSnapshot = (product, variant) => {
  const unitPrice = getFirstNumber(
    variant?.price,
    variant?.unitPrice,
    variant?.basePrice,
    getVariantAdjustedPrice(product, variant),
    product.price,
    product.unitPrice,
    product.basePrice,
    product.regularPrice
  );
  const discountedUnitPrice = getFirstNumber(
    variant?.discountedPrice,
    variant?.discountPrice,
    variant?.discountedUnitPrice,
    variant?.salePrice,
    ...(!variant
      ? [
          product.discountedPrice,
          product.discountPrice,
          product.discountedUnitPrice,
          product.salePrice,
        ]
      : [])
  );

  return {
    unitPrice,
    discountedUnitPrice,
  };
};

const getStock = (product, variant) => {
  return getFirstNumber(
    variant?.stock,
    variant?.quantity,
    variant?.stockQuantity,
    product.stock,
    product.quantity,
    product.stockQuantity
  );
};

const getWeight = (product, variant) => {
  const weight = getFirstValue(variant?.weight, product.weight);

  return weight === undefined || weight === null ? null : weight;
};

const getStockKey = (item) => {
  return item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
};

const getRequestedQuantityMap = (items) => {
  return items.reduce((quantityMap, item) => {
    const stockKey = getStockKey(item);
    const currentQuantity = quantityMap.get(stockKey) || 0;

    quantityMap.set(stockKey, currentQuantity + item.quantity);

    return quantityMap;
  }, new Map());
};

const reduceProductStock = (product, quantity) => {
  if (product.stockQuantity < quantity) {
    const error = new Error("Insufficient product stock");
    error.statusCode = 400;
    throw error;
  }

  product.stockQuantity -= quantity;
  product.isOutOfStock = product.stockQuantity <= 0;
};

const reduceVariantStock = (variant, quantity) => {
  if (variant.stockQuantity < quantity) {
    const error = new Error("Insufficient product stock");
    error.statusCode = 400;
    throw error;
  }

  variant.stockQuantity -= quantity;
};

const syncProductStockFromVariants = (product) => {
  const totalVariantStock = getProductVariants(product).reduce((total, variant) => {
    return total + (getFirstNumber(variant.stockQuantity, 0) || 0);
  }, 0);

  product.isOutOfStock = Number(product.stockQuantity || 0) + totalVariantStock <= 0;
};

const restoreStockForOrder = async ({ order, session }) => {
  const Product = getProductModel();
  const productIds = [
    ...new Set(order.items.map((item) => item.product.toString())),
  ];
  const products = await Product.find({
    _id: { $in: productIds.map(toObjectId) },
  }).session(session);
  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  for (const item of order.items) {
    const product = productsById.get(item.product.toString());

    if (!product) {
      continue;
    }

    if (item.variantId) {
      const variant = findVariant(product, item.variantId);

      if (variant) {
        variant.stockQuantity += item.quantity;
        syncProductStockFromVariants(product);
      }
    } else {
      product.stockQuantity += item.quantity;
      syncProductStockFromVariants(product);
    }
  }

  await Promise.all(
    [...productsById.values()].map((product) => product.save({ session }))
  );
};

const reduceStockForItems = async ({ productsById, items, session }) => {
  const requestedQuantityMap = getRequestedQuantityMap(items);
  const processedStockKeys = new Set();
  const productsToSave = new Set();

  for (const item of items) {
    const stockKey = getStockKey(item);

    if (processedStockKeys.has(stockKey)) {
      continue;
    }

    const product = productsById.get(item.productId);
    const variant = findVariant(product, item.variantId);
    const quantity = requestedQuantityMap.get(stockKey);

    if (item.variantId) {
      reduceVariantStock(variant, quantity);
      syncProductStockFromVariants(product);
    } else {
      reduceProductStock(product, quantity);
      syncProductStockFromVariants(product);
    }

    processedStockKeys.add(stockKey);
    productsToSave.add(product);
  }

  await Promise.all(
    [...productsToSave].map((product) => product.save({ session }))
  );
};

const generateOrderNumber = async (session) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderNumber = `ORD-${timestamp}-${random}`;
    const existingOrder = await Order.findOne({ orderNumber })
      .setOptions({
        withDeleted: true,
      })
      .session(session);

    if (!existingOrder) {
      return orderNumber;
    }
  }

  return `ORD-${new mongoose.Types.ObjectId().toString().toUpperCase()}`;
};

const userHasPreviousOrders = async ({ userId, session }) => {
  const order = await Order.exists({ user: userId }).session(session);
  return Boolean(order);
};

const getUserUsageCount = (promoCode, userId) => {
  const usage = (promoCode.usageRecords || []).find(
    (record) => record.user?.toString() === userId.toString()
  );

  return usage?.count || 0;
};

const validatePromoScope = ({ promo, orderItems, user }) => {
  const scope = promo.scope || { type: "all" };
  const scopeType = scope.type || "all";

  if (scopeType === "all" || scopeType === "new-users") {
    return true;
  }

  if (scopeType === "users") {
    return (scope.userIds || []).some((id) => idsMatch(id, user._id));
  }

  const productIds = new Set(orderItems.map((item) => item.product.toString()));
  const categoryIds = new Set(
    orderItems
      .map((item) => item.category?.toString())
      .filter(Boolean)
  );

  if (scopeType === "products" || scopeType === "items") {
    return [...(scope.productIds || []), ...(scope.itemIds || [])].some((id) =>
      productIds.has(id.toString())
    );
  }

  if (scopeType === "categories") {
    return (scope.categoryIds || []).some((id) => categoryIds.has(id.toString()));
  }

  return false;
};

const calculatePromoDiscount = async ({ promoCode, subtotal, orderItems, user, session }) => {
  if (!promoCode) {
    return { promo: null, discount: 0 };
  }

  const promo = await PromoCode.findOne({
    nameNormalized: promoCode.trim().toLowerCase(),
  }).session(session);

  if (!promo) {
    throw createHttpError(400, "Promo code not found");
  }

  const now = new Date();

  if (!promo.isActive) {
    throw createHttpError(400, "Promo code is inactive");
  }

  if (promo.startDate > now) {
    throw createHttpError(400, "Promo code has not started yet");
  }

  if (promo.expiryDate < now) {
    throw createHttpError(400, "Promo code has expired");
  }

  if (subtotal < promo.minOrder) {
    throw createHttpError(400, `Minimum order amount is ${promo.minOrder}`);
  }

  if (promo.totalUsageLimit && promo.usageCount >= promo.totalUsageLimit) {
    throw createHttpError(400, "Promo code usage limit reached");
  }

  if (getUserUsageCount(promo, user._id) >= promo.usageLimitPerUser) {
    throw createHttpError(400, "You have reached the usage limit for this promo code");
  }

  if (
    promo.scope?.type === "new-users" &&
    (await userHasPreviousOrders({ userId: user._id, session }))
  ) {
    throw createHttpError(400, "This promo code is only for new users");
  }

  if (!validatePromoScope({ promo, orderItems, user })) {
    throw createHttpError(400, "Promo code is not applicable to this order");
  }

  const rawDiscount =
    promo.discountType === "percentage"
      ? (subtotal * promo.discountValue) / 100
      : promo.discountValue;
  const cappedDiscount =
    promo.maxAmount === null || promo.maxAmount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, promo.maxAmount);

  return {
    promo,
    discount: roundMoney(Math.min(subtotal, cappedDiscount)),
  };
};

const recordPromoUsage = async ({ promo, userId, session }) => {
  if (!promo) {
    return;
  }

  const usage = (promo.usageRecords || []).find((record) =>
    idsMatch(record.user, userId)
  );

  if (usage) {
    usage.count += 1;
    usage.lastUsedAt = new Date();
  } else {
    promo.usageRecords.push({
      user: userId,
      count: 1,
      lastUsedAt: new Date(),
    });
  }

  promo.usageCount += 1;
  await promo.save({ session });
};

const createOrder = async (req, res, next) => {
  if (!req.user?._id) {
    return sendError(res, 401, "Authentication required to create an order");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const Product = getProductModel();
    const { items, promoCode, paymentMethod, shippingAddress, deliveryZone } =
      req.validatedOrder;
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({
      _id: { $in: productIds.map(toObjectId) },
      isActive: true,
      isDeleted: { $ne: true },
    }).session(session);
    const productsById = new Map(
      products.map((product) => [product._id.toString(), product])
    );
    const orderItems = [];
    const warnings = [];
    const requestedQuantityMap = getRequestedQuantityMap(items);

    for (const item of items) {
      const product = productsById.get(item.productId);

      if (!product) {
        throw createHttpError(404, "Product not found");
      }

      const hasVariants = productHasVariants(product);

      if (!hasVariants && item.variantId) {
        throw createHttpError(400, "This product does not have variants");
      }

      const variant = findVariant(product, item.variantId);

      if (item.variantId && !variant) {
        throw createHttpError(404, "Product variant not found");
      }

      if (variant?.isActive === false) {
        throw createHttpError(400, "Product variant is not active");
      }

      const stock = variant
        ? getFirstNumber(variant.stockQuantity, variant.stock, variant.quantity)
        : getFirstNumber(product.stockQuantity, product.stock, product.quantity);
      const requestedQuantity = requestedQuantityMap.get(getStockKey(item));

      if (stock !== null && stock < requestedQuantity) {
        throw createHttpError(400, "Insufficient product stock");
      }

      const { unitPrice, discountedUnitPrice } = getPricingSnapshot(product, variant);

      if (unitPrice === null) {
        throw createHttpError(400, "Product price is not available");
      }

      const finalUnitPrice =
        discountedUnitPrice !== null ? discountedUnitPrice : unitPrice;
      const itemSubtotal = finalUnitPrice * item.quantity;
      const productName = getProductName(product);
      const image = getProductImage(product, variant);

      if (!productName) {
        throw createHttpError(400, "Product name is not available");
      }

      if (!image) {
        warnings.push(`Product image is not available for ${productName}`);
      }

      orderItems.push({
        product: product._id,
        category: product.category,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        variantName: getVariantName(variant),
        productName,
        image: image || null,
        quantity: item.quantity,
        weight: getWeight(product, variant),
        unitPrice,
        discountedUnitPrice,
        finalUnitPrice,
        itemSubtotal,
      });
    }

    const subtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + item.itemSubtotal, 0)
    );
    const promoResult = await calculatePromoDiscount({
      promoCode,
      subtotal,
      orderItems,
      user: req.user,
      session,
    });
    const promoDiscount = promoResult.discount;
    const discountedSubtotal = roundMoney(Math.max(0, subtotal - promoDiscount));
    const deliverySettings = await getDeliveryZoneSettings();
    const delivery = getDeliveryCharge(
      deliveryZone,
      discountedSubtotal,
      deliverySettings
    );
    const deliveryCharge = delivery.deliveryCharge;
    const grandTotal = roundMoney(discountedSubtotal + deliveryCharge);
    const orderNumber = await generateOrderNumber(session);

    const [order] = await Order.create(
      [
        {
          orderNumber,
          user: req.user._id,
          userInfo: {
            name: shippingAddress.name,
            email: req.user.email,
            phone: shippingAddress.phone,
          },
          items: orderItems,
          subtotal,
          promoCode,
          promoDiscount,
          deliveryZone: delivery.deliveryZone,
          deliveryCharge,
          grandTotal,
          paymentMethod,
          paymentStatus: "Pending",
          orderStatus: "Pending",
          shippingAddress,
        },
      ],
      { session }
    );

    await recordPromoUsage({
      promo: promoResult.promo,
      userId: req.user._id,
      session,
    });
    await reduceStockForItems({ productsById, items, session });
    await session.commitTransaction();

    return sendSuccess(res, 201, "Order created successfully", {
      order,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    error.statusCode = error.statusCode || 500;
    return next(error);
  } finally {
    session.endSession();
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Orders fetched successfully", { orders });
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Orders fetched successfully", { orders });
  } catch (error) {
    return next(error);
  }
};

const getSingleOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.orderId);

    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    if (
      req.user &&
      !isAdmin(req.user) &&
      !idsMatch(order.user, req.user._id)
    ) {
      return sendError(res, 403, "You are not allowed to access this order");
    }

    return sendSuccess(res, 200, "Order fetched successfully", { order });
  } catch (error) {
    return next(error);
  }
};

const updateOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(req.orderId).session(session);

    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    const { shippingAddress, ...updateData } = req.validatedOrder;
    const nextOrderStatus = updateData.orderStatus ?? order.orderStatus;
    const nextPaymentStatus = updateData.paymentStatus ?? order.paymentStatus;

    if (nextOrderStatus === "Delivered" && nextPaymentStatus !== "Paid") {
      throw createHttpError(
        400,
        "Unpaid orders cannot be marked as delivered. Mark the payment as paid first."
      );
    }

    const shouldRestoreStock =
      updateData.orderStatus === "Cancelled" &&
      order.orderStatus !== "Cancelled" &&
      !order.stockRestored;

    order.set(updateData);

    if (shippingAddress) {
      order.set({
        shippingAddress: {
          ...order.shippingAddress?.toObject(),
          ...shippingAddress,
        },
      });
    }

    if (shouldRestoreStock) {
      await restoreStockForOrder({ order, session });
      order.stockRestored = true;
    }

    await order.save({ session });
    await session.commitTransaction();

    return sendSuccess(res, 200, "Order updated successfully", { order });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return next(error);
  } finally {
    session.endSession();
  }
};

const refundOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.orderId);

    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    if (
      order.paymentStatus !== "Paid" &&
      order.paymentStatus !== "Partially Refunded"
    ) {
      return sendError(res, 400, "Only paid orders can be refunded");
    }

    const totalRefunded = order.refunds.reduce((sum, refund) => {
      return sum + (refund.amount || 0);
    }, 0);
    const remainingRefundableAmount = order.grandTotal - totalRefunded;

    if (req.validatedRefund.amount > remainingRefundableAmount) {
      return sendError(res, 400, "Refund amount cannot exceed order total");
    }

    const newTotalRefunded = totalRefunded + req.validatedRefund.amount;
    const paymentStatus =
      newTotalRefunded < order.grandTotal
        ? "Partially Refunded"
        : "Refunded";

    order.set({
      paymentStatus,
    });
    order.refunds.push({
      ...req.validatedRefund,
      refundedAt: new Date(),
      refundedBy: req.user._id,
    });
    await order.save();

    return sendSuccess(res, 200, "Order refunded successfully", { order });
  } catch (error) {
    return next(error);
  }
};

const softDeleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.orderId);

    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    order.set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id,
    });
    await order.save();

    return sendSuccess(res, 200, "Order deleted successfully", { order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  getSingleOrder,
  updateOrder,
  refundOrder,
  softDeleteOrder,
};
