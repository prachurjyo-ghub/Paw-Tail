import { getApiBaseUrl } from "@/lib/apiBaseUrl";

const FETCH_TIMEOUT_MS = 8000;

export const toClientOrderStatus = (status) => {
  if (status === "Shipped") return "In Transit";
  if (status === "Confirmed") return "Processing";
  return status || "Pending";
};

const formatOrderDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const normalizeOrderForProfile = (order) => ({
  mongoId: order._id,
  id: order.orderNumber || order._id,
  date: formatOrderDate(order.createdAt),
  createdAt: order.createdAt,
  status: order.orderStatus || "Pending",
  displayStatus: toClientOrderStatus(order.orderStatus),
  itemsCount:
    order.items?.reduce((total, item) => total + (Number(item.quantity) || 0), 0) ||
    0,
  subtotal: Number(order.subtotal) || 0,
  promoCode: order.promoCode || "",
  promoDiscount: Number(order.promoDiscount) || 0,
  deliveryCharge: Number(order.deliveryCharge) || 0,
  total: Number(order.grandTotal) || 0,
  products: order.items?.map((item) => item.productName).filter(Boolean) || [],
  items: order.items || [],
  paymentMethod: order.paymentMethod || "COD",
  paymentStatus: order.paymentStatus || "Pending",
  shippingAddress: order.shippingAddress || null,
  cancelledReason: order.cancelledReason || "",
});

export async function getMyOrdersFromApi() {
  const response = await fetch(`${getApiBaseUrl()}/orders/my-orders`, {
    cache: "no-store",
    credentials: "include",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load orders");
  }

  const orders = data.data?.orders || data.orders || [];
  return orders.map(normalizeOrderForProfile);
}
