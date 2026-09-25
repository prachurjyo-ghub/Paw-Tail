const GUEST_CART_KEY = "pawtail-guest-cart";
const GUEST_WISHLIST_KEY = "pawtail-wishlist";

export const getGuestCartLineKey = (productId, variantId) =>
  `${productId}:${variantId || "default"}`;

export const readGuestCartItems = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const writeGuestCartItems = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const clearGuestCartItems = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const readGuestWishlistItems = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const writeGuestWishlistItems = (items) => {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
};

export const clearGuestWishlistItems = () => {
  localStorage.removeItem(GUEST_WISHLIST_KEY);
};

export const buildGuestCartItem = (product, variant, quantity) => {
  const basePrice =
    typeof product.discountPrice === "number"
      ? product.discountPrice
      : product.price;
  const finalUnitPrice =
    typeof variant?.price === "number"
      ? Number(variant.price)
      : variant
        ? Number(product.price || 0) + Number(variant.priceAdjustment || 0)
        : Number(basePrice || 0);
  const stockQuantity = variant?.stockQuantity ?? product.stockQuantity ?? 0;

  return {
    _id: getGuestCartLineKey(product._id, variant?._id),
    product: {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      image:
        product.images?.[0] ||
        product.image ||
        product.imageUrl ||
        null,
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
    quantity,
    stockQuantity,
    isAvailable: !product.isOutOfStock && stockQuantity > 0,
    finalUnitPrice,
    itemSubtotal: finalUnitPrice * quantity,
  };
};

export const formatGuestCart = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    _id: "guest",
    items,
    itemCount,
    subtotal,
  };
};

const resolveWishlistImage = (product) => {
  if (Array.isArray(product.images) && product.images[0]) {
    return product.images[0];
  }

  if (product.image) {
    return product.image;
  }

  if (product.imageUrl) {
    return product.imageUrl;
  }

  return null;
};

export const normalizeWishlistProduct = (product) => ({
  _id: product._id,
  name: product.name,
  slug: product.slug,
  image: resolveWishlistImage(product),
  price: product.price,
  discountPrice: product.discountPrice,
  brand: product.brand?.name || product.brand || null,
});

export const calculateGuestCartSummary = ({
  subtotal,
  deliveryZone = "inside-dhaka",
  promoCode = "",
  deliverySettings = null,
}) => {
  const threshold = Number(deliverySettings?.freeDeliveryThreshold ?? 500);
  const insideCharge = Number(deliverySettings?.insideDhakaCharge ?? 60);
  const outsideCharge = Number(deliverySettings?.outsideDhakaCharge ?? 120);
  const baseCharge = deliveryZone === "outside-dhaka" ? outsideCharge : insideCharge;
  const deliveryCharge = threshold > 0 && subtotal >= threshold ? 0 : baseCharge;

  return {
    itemsSubtotal: subtotal,
    voucherDiscount: 0,
    discountedSubtotal: subtotal,
    deliveryZone,
    deliveryCharge,
    freeDeliveryThreshold: threshold,
    grandTotal: subtotal + deliveryCharge,
    voucherMessage: promoCode ? "Sign in to apply voucher codes" : "",
  };
};
