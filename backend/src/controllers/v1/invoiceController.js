const mongoose = require("mongoose");

const Order = require("../../models/Order");
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toInvoiceNumber = (orderNumber) => `INV-${orderNumber}`;

const mapInvoiceSummary = (order) => ({
  id: order._id,
  invoiceNumber: toInvoiceNumber(order.orderNumber),
  orderNumber: order.orderNumber,
  orderId: order._id,
  customerName: order.userInfo?.name || order.shippingAddress?.name || "—",
  customerEmail: order.userInfo?.email || "—",
  customerPhone: order.userInfo?.phone || order.shippingAddress?.phone || "—",
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  itemCount: Array.isArray(order.items) ? order.items.length : 0,
  subtotal: order.subtotal,
  promoDiscount: order.promoDiscount || 0,
  deliveryCharge: order.deliveryCharge || 0,
  grandTotal: order.grandTotal,
  issuedAt: order.updatedAt || order.createdAt,
  createdAt: order.createdAt,
});

const mapInvoiceDetail = (order) => ({
  ...mapInvoiceSummary(order),
  promoCode: order.promoCode || null,
  deliveryZone: order.deliveryZone,
  shippingAddress: order.shippingAddress,
  userInfo: order.userInfo,
  items: (order.items || []).map((item, index) => ({
    key: `${item.product}-${index}`,
    productName: item.productName,
    variantName: item.variantName,
    weight: item.weight,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    finalUnitPrice: item.finalUnitPrice,
    itemSubtotal: item.itemSubtotal,
    image: item.image,
  })),
  adminNote: order.adminNote,
});

const getInvoices = async (req, res, next) => {
  try {
    const filter = { paymentStatus: "Paid" };

    if (req.query.q) {
      const q = escapeRegex(String(req.query.q).trim().slice(0, 100));
      if (q) {
        filter.$or = [
          { orderNumber: { $regex: q, $options: "i" } },
          { "userInfo.name": { $regex: q, $options: "i" } },
          { "userInfo.email": { $regex: q, $options: "i" } },
          { "userInfo.phone": { $regex: q, $options: "i" } },
          { "shippingAddress.name": { $regex: q, $options: "i" } },
          { "shippingAddress.phone": { $regex: q, $options: "i" } },
        ];
      }
    }

    if (req.query.orderStatus) {
      filter.orderStatus = req.query.orderStatus;
    }

    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
    const [orders, totals] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: "$grandTotal" } } },
      ]),
    ]);
    const invoices = orders.map(mapInvoiceSummary);
    const total = totals[0]?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      invoices,
      summary: {
        total,
        revenue: totals[0]?.revenue || 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid order id is required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (order.paymentStatus !== "Paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is only available for paid orders",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully",
      invoice: mapInvoiceDetail(order),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoice,
};
