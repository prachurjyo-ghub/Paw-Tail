export const activeOrders = [];

export function findAdminOrder(orderId) {
  return activeOrders.find((order) => order.id === orderId);
}
