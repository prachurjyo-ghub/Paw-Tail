const mongoose = require("mongoose");

const PromoCode = require("../../models/PromoCode");

const validScopeTypes = ["all", "items", "categories", "products", "users", "new-users"];

const isInvalidId = (id, res, label = "promo code") => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }

  res.status(400).json({
    success: false,
    message: `Valid ${label} id is required`,
  });
  return true;
};

const normalizeName = (name) => name.trim().toLowerCase();

const findByName = (name, promoCodeId = null) => {
  return PromoCode.findOne({
    nameNormalized: normalizeName(name),
    ...(promoCodeId ? { _id: { $ne: promoCodeId } } : {}),
  });
};

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((id) => mongoose.Types.ObjectId.isValid(id));
};

const buildScope = (scope = {}) => {
  const type = validScopeTypes.includes(scope.type) ? scope.type : "all";

  return {
    type,
    itemIds: normalizeIdList(scope.itemIds),
    categoryIds: normalizeIdList(scope.categoryIds),
    productIds: normalizeIdList(scope.productIds),
    userIds: normalizeIdList(scope.userIds),
  };
};

const buildPromoCodeData = (body) => {
  const data = {};

  if (body.name !== undefined) {
    data.name = body.name.trim();
  }

  if (body.discountType !== undefined) {
    data.discountType = body.discountType;
  }

  if (body.discountValue !== undefined) {
    data.discountValue = Number(body.discountValue);
  }

  if (body.minOrder !== undefined) {
    data.minOrder = Number(body.minOrder);
  }

  if (body.maxAmount !== undefined) {
    data.maxAmount = body.maxAmount === null ? null : Number(body.maxAmount);
  }

  if (body.totalUsageLimit !== undefined) {
    data.totalUsageLimit =
      body.totalUsageLimit === null ? null : Number(body.totalUsageLimit);
  }

  if (body.usageLimitPerUser !== undefined) {
    data.usageLimitPerUser = Number(body.usageLimitPerUser);
  }

  if (body.startDate !== undefined) {
    data.startDate = new Date(body.startDate);
  }

  if (body.expiryDate !== undefined) {
    data.expiryDate = new Date(body.expiryDate);
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  if (body.scope !== undefined) {
    data.scope = buildScope(body.scope);
  }

  return data;
};

const validatePromoCodePayload = (data, isUpdate = false) => {
  if (!isUpdate && !data.name) {
    return "Promo code name is required";
  }

  if (data.name !== undefined && !data.name) {
    return "Promo code name is required";
  }

  if (!isUpdate && !data.discountType) {
    return "Discount type is required";
  }

  if (
    data.discountType !== undefined &&
    !["percentage", "amount"].includes(data.discountType)
  ) {
    return "Discount type must be percentage or amount";
  }

  if (!isUpdate && data.discountValue === undefined) {
    return "Discount value is required";
  }

  if (
    data.discountValue !== undefined &&
    (!Number.isFinite(data.discountValue) || data.discountValue <= 0)
  ) {
    return "Discount value must be greater than 0";
  }

  if (data.minOrder !== undefined && (!Number.isFinite(data.minOrder) || data.minOrder < 0)) {
    return "Minimum order must be 0 or more";
  }

  if (
    data.maxAmount !== undefined &&
    data.maxAmount !== null &&
    (!Number.isFinite(data.maxAmount) || data.maxAmount < 0)
  ) {
    return "Max amount must be 0 or more";
  }

  if (
    data.totalUsageLimit !== undefined &&
    data.totalUsageLimit !== null &&
    (!Number.isFinite(data.totalUsageLimit) || data.totalUsageLimit < 1)
  ) {
    return "Total usage limit must be at least 1";
  }

  if (
    data.usageLimitPerUser !== undefined &&
    (!Number.isFinite(data.usageLimitPerUser) || data.usageLimitPerUser < 1)
  ) {
    return "Usage limit per user must be at least 1";
  }

  if (!isUpdate && !data.startDate) {
    return "Start date is required";
  }

  if (!isUpdate && !data.expiryDate) {
    return "Expiry date is required";
  }

  if (data.startDate !== undefined && Number.isNaN(data.startDate.getTime())) {
    return "Start date must be a valid date";
  }

  if (data.expiryDate !== undefined && Number.isNaN(data.expiryDate.getTime())) {
    return "Expiry date must be a valid date";
  }

  if (data.scope !== undefined) {
    const scopeType = data.scope.type || "all";

    if (scopeType === "products" && data.scope.productIds.length === 0) {
      return "Select at least one product for this promo scope";
    }

    if (scopeType === "items" && data.scope.itemIds.length === 0) {
      return "Select at least one item for this promo scope";
    }

    if (scopeType === "categories" && data.scope.categoryIds.length === 0) {
      return "Select at least one category for this promo scope";
    }

    if (scopeType === "users" && data.scope.userIds.length === 0) {
      return "Select at least one user for this promo scope";
    }
  }

  return null;
};

const userHasOrders = async (user) => {
  if (typeof user.orderCount === "number") {
    return user.orderCount > 0;
  }

  if (Array.isArray(user.orders)) {
    return user.orders.length > 0;
  }

  const Order = mongoose.models.Order;

  if (!Order) {
    return false;
  }

  const order = await Order.exists({
    $or: [{ user: user._id }, { userId: user._id }, { customer: user._id }],
  });
  return Boolean(order);
};

const getUserUsageCount = (promoCode, userId) => {
  const usage = promoCode.usageRecords.find(
    (record) => record.user.toString() === userId.toString()
  );

  return usage?.count || 0;
};

const getPromoCodes = async (req, res, next) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Promo codes fetched successfully",
      promoCodes,
    });
  } catch (error) {
    next(error);
  }
};

const postPromoCode = async (req, res, next) => {
  try {
    const data = buildPromoCodeData(req.body);
    const validationMessage = validatePromoCodePayload(data);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const existingPromoCode = await findByName(data.name);

    if (existingPromoCode) {
      return res.status(400).json({
        success: false,
        message: "This promo code already exists",
      });
    }

    const promoCode = await PromoCode.create(data);

    return res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      promoCode,
    });
  } catch (error) {
    next(error);
  }
};

const updatePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isInvalidId(id, res)) {
      return;
    }

    const promoCode = await PromoCode.findById(id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    const data = buildPromoCodeData(req.body);
    const validationMessage = validatePromoCodePayload(data, true);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    if (data.name) {
      const existingPromoCode = await findByName(data.name, promoCode._id);

      if (existingPromoCode) {
        return res.status(400).json({
          success: false,
          message: "This promo code already exists",
        });
      }
    }

    Object.assign(promoCode, data);
    await promoCode.save();

    return res.status(200).json({
      success: true,
      message: "Promo code updated successfully",
      promoCode,
    });
  } catch (error) {
    next(error);
  }
};

const deletePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isInvalidId(id, res)) {
      return;
    }

    const promoCode = await PromoCode.findByIdAndDelete(id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Promo code deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const togglePromoCodeActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isInvalidId(id, res)) {
      return;
    }

    const promoCode = await PromoCode.findById(id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    promoCode.isActive =
      typeof req.body.isActive === "boolean" ? req.body.isActive : !promoCode.isActive;
    await promoCode.save();

    return res.status(200).json({
      success: true,
      message: "Promo code active status updated successfully",
      promoCode,
    });
  } catch (error) {
    next(error);
  }
};

const validatePromoCode = async (req, res, next) => {
  try {
    const { name, orderAmount = 0, itemIds = [], categoryIds = [], productIds = [] } = req.body;
    const user = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Promo code name is required",
      });
    }

    const promoCode = await findByName(name);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    const now = new Date();

    if (!promoCode.isActive) {
      return res.status(400).json({
        success: false,
        message: "Promo code is inactive",
      });
    }

    if (promoCode.startDate > now) {
      return res.status(400).json({
        success: false,
        message: "Promo code has not started yet",
      });
    }

    if (promoCode.expiryDate < now) {
      return res.status(400).json({
        success: false,
        message: "Promo code has expired",
      });
    }

    if (promoCode.totalUsageLimit && promoCode.usageCount >= promoCode.totalUsageLimit) {
      return res.status(400).json({
        success: false,
        message: "Promo code usage limit reached",
      });
    }

    if (Number(orderAmount) < promoCode.minOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${promoCode.minOrder}`,
      });
    }

    const userUsageCount = getUserUsageCount(promoCode, user._id);

    if (userUsageCount >= promoCode.usageLimitPerUser) {
      return res.status(400).json({
        success: false,
        message: "You have reached the usage limit for this promo code",
      });
    }

    if (promoCode.scope.type === "new-users" && (await userHasOrders(user))) {
      return res.status(400).json({
        success: false,
        message: "This promo code is only for new users",
      });
    }

    if (
      promoCode.scope.type === "users" &&
      !promoCode.scope.userIds.some((id) => id.toString() === user._id.toString())
    ) {
      return res.status(400).json({
        success: false,
        message: "This promo code is not available for this user",
      });
    }

    const hasMatchingScopeId = (requestIds, promoIds) => {
      const requestIdSet = new Set(requestIds.map((id) => id.toString()));
      return promoIds.some((id) => requestIdSet.has(id.toString()));
    };

    if (
      promoCode.scope.type === "items" &&
      !hasMatchingScopeId(itemIds, promoCode.scope.itemIds)
    ) {
      return res.status(400).json({
        success: false,
        message: "Promo code is not applicable to these items",
      });
    }

    if (
      promoCode.scope.type === "categories" &&
      !hasMatchingScopeId(categoryIds, promoCode.scope.categoryIds)
    ) {
      return res.status(400).json({
        success: false,
        message: "Promo code is not applicable to these categories",
      });
    }

    if (
      promoCode.scope.type === "products" &&
      !hasMatchingScopeId(productIds, promoCode.scope.productIds)
    ) {
      return res.status(400).json({
        success: false,
        message: "Promo code is not applicable to these products",
      });
    }

    const rawDiscount =
      promoCode.discountType === "percentage"
        ? (Number(orderAmount) * promoCode.discountValue) / 100
        : promoCode.discountValue;

    const discountAmount =
      promoCode.maxAmount === null ? rawDiscount : Math.min(rawDiscount, promoCode.maxAmount);

    return res.status(200).json({
      success: true,
      message: "Promo code is valid",
      promoCode,
      discountAmount,
    });
  } catch (error) {
    next(error);
  }
};

const checkPromoCode = async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Promo code name is required",
      });
    }

    const promoCode = await findByName(name);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "This code is not a valid checkout promo code",
      });
    }

    const now = new Date();

    if (!promoCode.isActive) {
      return res.status(400).json({
        success: false,
        message: "Promo code is inactive",
      });
    }

    if (promoCode.startDate > now) {
      return res.status(400).json({
        success: false,
        message: "Promo code has not started yet",
      });
    }

    if (promoCode.expiryDate < now) {
      return res.status(400).json({
        success: false,
        message: "Promo code has expired",
      });
    }

    const discountLabel =
      promoCode.discountType === "percentage"
        ? `${promoCode.discountValue}% off`
        : `Tk ${promoCode.discountValue} off`;

    return res.status(200).json({
      success: true,
      message: "Promo code is ready for checkout",
      promoCode: {
        name: promoCode.name,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        minOrder: promoCode.minOrder,
      },
      discountLabel,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromoCodes,
  postPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeActive,
  validatePromoCode,
  checkPromoCode,
};
