const mongoose = require("mongoose");

// Online methods stay disabled until a signed provider flow and webhook reconciliation exist.
const PAYMENT_METHODS = ["COD"];
const PAYMENT_STATUSES = [
  "Pending",
  "Paid",
  "Failed",
  "Partially Refunded",
  "Refunded",
];
const DIRECT_UPDATE_PAYMENT_STATUSES = ["Pending", "Paid", "Failed"];
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const DELIVERY_ZONES = ["inside-dhaka", "outside-dhaka"];
const CREATE_ORDER_FIELDS = [
  "items",
  "promoCode",
  "paymentMethod",
  "shippingAddress",
  "deliveryZone",
];
const CREATE_ORDER_ITEM_FIELDS = ["productId", "variantId", "quantity"];
const UPDATE_ORDER_FIELDS = [
  "shippingAddress",
  "adminNote",
  "cancelledReason",
  "orderStatus",
  "paymentStatus",
];
const REJECTED_CREATE_FIELDS = [
  "unitPrice",
  "discountedUnitPrice",
  "finalUnitPrice",
  "subtotal",
  "promoDiscount",
  "deliveryCharge",
  "grandTotal",
  "productName",
  "image",
  "userInfo",
];
const REJECTED_UPDATE_FIELDS = [
  "unitPrice",
  "discountedUnitPrice",
  "finalUnitPrice",
  "subtotal",
  "promoDiscount",
  "deliveryCharge",
  "grandTotal",
  "productName",
  "image",
  "userInfo",
  "items",
  "paymentMethod",
  "promoCode",
];

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const isProvided = (value) => {
  return value !== undefined;
};

const hasAnyProvidedField = (fields) => {
  return fields.some(isProvided);
};

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const isValidObjectId = (value) => {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
};

const fail = (res, message) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

const findForbiddenField = (value, forbiddenFields) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const forbiddenField = findForbiddenField(item, forbiddenFields);

      if (forbiddenField) {
        return forbiddenField;
      }
    }

    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  for (const key of Object.keys(value)) {
    if (forbiddenFields.includes(key)) {
      return key;
    }

    const forbiddenField = findForbiddenField(value[key], forbiddenFields);

    if (forbiddenField) {
      return forbiddenField;
    }
  }

  return null;
};

const findUnknownTopLevelField = (body, allowedFields) => {
  return Object.keys(body).find((field) => !allowedFields.includes(field));
};

const validateOptionalText = (value, emptyMessage) => {
  if (!isProvided(value)) {
    return {};
  }

  const cleanValue = normalizeText(value);

  if (!cleanValue) {
    return {
      error: emptyMessage,
    };
  }

  return {
    value: cleanValue,
  };
};

const validateRequiredText = (value, emptyMessage) => {
  const cleanValue = normalizeText(value);

  if (!cleanValue) {
    return {
      error: emptyMessage,
    };
  }

  return {
    value: cleanValue,
  };
};

const validateQuantity = (quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      error: "Quantity must be at least 1",
    };
  }

  return {
    value: quantity,
  };
};

const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      error: "Items must be a non-empty array",
    };
  }

  const cleanItems = [];

  for (const item of items) {
    if (!isPlainObject(item)) {
      return {
        error: "Each item must be an object",
      };
    }

    const unknownItemField = findUnknownTopLevelField(item, CREATE_ORDER_ITEM_FIELDS);

    if (unknownItemField) {
      return {
        error: `${unknownItemField} is not allowed in order items`,
      };
    }

    const { productId, variantId, quantity } = item;

    if (!isValidObjectId(productId)) {
      return {
        error: "Product id must be a valid ObjectId",
      };
    }

    if (
      isProvided(variantId) &&
      variantId !== null &&
      !isValidObjectId(variantId)
    ) {
      return {
        error: "Variant id must be a valid ObjectId",
      };
    }

    const cleanQuantity = validateQuantity(quantity);

    if (cleanQuantity.error) {
      return cleanQuantity;
    }

    cleanItems.push({
      productId,
      quantity: cleanQuantity.value,
      ...(isProvided(variantId) && variantId !== null ? { variantId } : {}),
    });
  }

  return {
    value: cleanItems,
  };
};

const validatePaymentMethodValue = (paymentMethod) => {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return {
      error: "Invalid payment method",
    };
  }

  return {
    value: paymentMethod,
  };
};

const validateShippingAddress = (shippingAddress, options = {}) => {
  const { partial = false } = options;

  if (!isPlainObject(shippingAddress)) {
    return {
      error: "Shipping address must be an object",
    };
  }

  const requiredFields = ["name", "phone", "city", "area", "address"];
  const allowedFields = [...requiredFields, "postalCode"];
  const unknownField = findUnknownTopLevelField(shippingAddress, allowedFields);

  if (unknownField) {
    return {
      error: `Invalid shipping address field: ${unknownField}`,
    };
  }

  const cleanShippingAddress = {};

  for (const field of requiredFields) {
    const cleanField = partial
      ? validateOptionalText(shippingAddress[field], `${field} cannot be empty`)
      : validateRequiredText(shippingAddress[field], "Shipping address is incomplete");

    if (cleanField.error) {
      return cleanField;
    }

    if (isProvided(cleanField.value)) {
      cleanShippingAddress[field] = cleanField.value;
    }
  }

  const cleanPostalCode = validateOptionalText(
    shippingAddress.postalCode,
    "postalCode cannot be empty"
  );

  if (cleanPostalCode.error) {
    return cleanPostalCode;
  }

  if (isProvided(cleanPostalCode.value)) {
    cleanShippingAddress.postalCode = cleanPostalCode.value;
  }

  if (partial && Object.keys(cleanShippingAddress).length === 0) {
    return {
      error: "At least one shipping address field is required",
    };
  }

  return {
    value: cleanShippingAddress,
  };
};

const validateOrderIdentifier = (req, res, next) => {
  const orderId = normalizeText(req.params.id || req.params.orderId);

  if (!isValidObjectId(orderId)) {
    return fail(res, "Invalid order id");
  }

  req.orderId = orderId;
  next();
};

const validateCreateOrder = (req, res, next) => {
  const idempotencyKey = req.get("idempotency-key");
  if (!idempotencyKey || !/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    return fail(res, "A valid Idempotency-Key header is required");
  }
  if (!isPlainObject(req.body)) {
    return fail(res, "Request body must be an object");
  }

  const forbiddenField = findForbiddenField(req.body, REJECTED_CREATE_FIELDS);

  if (forbiddenField) {
    return fail(res, `${forbiddenField} cannot be provided when creating an order`);
  }

  const unknownField = findUnknownTopLevelField(req.body, CREATE_ORDER_FIELDS);

  if (unknownField) {
    return fail(res, `${unknownField} is not allowed when creating an order`);
  }

  const { items, promoCode, paymentMethod, shippingAddress, deliveryZone } = req.body;
  const cleanItems = validateOrderItems(items);

  if (cleanItems.error) {
    return fail(res, cleanItems.error);
  }

  const cleanPaymentMethod = validatePaymentMethodValue(paymentMethod);

  if (cleanPaymentMethod.error) {
    return fail(res, cleanPaymentMethod.error);
  }

  const cleanShippingAddress = validateShippingAddress(shippingAddress);

  if (cleanShippingAddress.error) {
    return fail(res, cleanShippingAddress.error);
  }

  const cleanPromoCode = validateOptionalText(promoCode, "Promo code cannot be empty");

  if (cleanPromoCode.error) {
    return fail(res, cleanPromoCode.error);
  }

  if (!DELIVERY_ZONES.includes(deliveryZone)) {
    return fail(res, "Valid delivery zone is required");
  }

  req.validatedOrder = {
    items: cleanItems.value,
    paymentMethod: cleanPaymentMethod.value,
    shippingAddress: cleanShippingAddress.value,
    deliveryZone,
    ...(isProvided(cleanPromoCode.value) ? { promoCode: cleanPromoCode.value } : {}),
  };
  req.idempotencyKey = idempotencyKey;

  next();
};

const validateUpdateOrder = (req, res, next) => {
  if (!isPlainObject(req.body)) {
    return fail(res, "Request body must be an object");
  }

  const forbiddenField = findForbiddenField(req.body, REJECTED_UPDATE_FIELDS);

  if (forbiddenField) {
    return fail(res, `${forbiddenField} cannot be updated directly`);
  }

  const unknownField = findUnknownTopLevelField(req.body, UPDATE_ORDER_FIELDS);

  if (unknownField) {
    return fail(res, `${unknownField} is not allowed when updating an order`);
  }

  const { shippingAddress, adminNote, cancelledReason, orderStatus, paymentStatus } =
    req.body;

  if (
    !hasAnyProvidedField([
      shippingAddress,
      adminNote,
      cancelledReason,
      orderStatus,
      paymentStatus,
    ])
  ) {
    return fail(res, "At least one field is required for update");
  }

  const validatedOrder = {};

  if (isProvided(shippingAddress)) {
    const cleanShippingAddress = validateShippingAddress(shippingAddress, {
      partial: true,
    });

    if (cleanShippingAddress.error) {
      return fail(res, cleanShippingAddress.error);
    }

    validatedOrder.shippingAddress = cleanShippingAddress.value;
  }

  const cleanAdminNote = validateOptionalText(adminNote, "Admin note cannot be empty");

  if (cleanAdminNote.error) {
    return fail(res, cleanAdminNote.error);
  }

  if (isProvided(cleanAdminNote.value)) {
    validatedOrder.adminNote = cleanAdminNote.value;
  }

  const cleanCancelledReason = validateOptionalText(
    cancelledReason,
    "Cancelled reason cannot be empty"
  );

  if (cleanCancelledReason.error) {
    return fail(res, cleanCancelledReason.error);
  }

  if (isProvided(cleanCancelledReason.value)) {
    validatedOrder.cancelledReason = cleanCancelledReason.value;
  }

  if (isProvided(orderStatus)) {
    if (!ORDER_STATUSES.includes(orderStatus)) {
      return fail(res, "Invalid order status");
    }

    validatedOrder.orderStatus = orderStatus;
  }

  if (isProvided(paymentStatus)) {
    if (!DIRECT_UPDATE_PAYMENT_STATUSES.includes(paymentStatus)) {
      return fail(res, "Invalid payment status");
    }

    validatedOrder.paymentStatus = paymentStatus;
  }

  req.validatedOrder = validatedOrder;
  next();
};

const validateRefundOrder = (req, res, next) => {
  const { amount, reason, transactionId } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return fail(res, "Refund amount must be positive");
  }

  const cleanReason = validateRequiredText(reason, "Refund reason is required");

  if (cleanReason.error) {
    return fail(res, cleanReason.error);
  }

  const cleanTransactionId = validateOptionalText(
    transactionId,
    "Transaction id cannot be empty"
  );

  if (cleanTransactionId.error) {
    return fail(res, cleanTransactionId.error);
  }

  req.validatedRefund = {
    amount,
    reason: cleanReason.value,
    ...(isProvided(cleanTransactionId.value)
      ? { transactionId: cleanTransactionId.value }
      : {}),
  };

  next();
};

module.exports = {
  validateCreateOrder,
  validateOrderIdentifier,
  validateUpdateOrder,
  validateRefundOrder,
};
