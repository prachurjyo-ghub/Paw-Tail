const mongoose = require("mongoose");

const Order = require("../../models/Order");

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
      const q = String(req.query.q).trim();
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

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    const invoices = orders.map(mapInvoiceSummary);

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      invoices,
      summary: {
        total: invoices.length,
        revenue: invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0),
      },
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
