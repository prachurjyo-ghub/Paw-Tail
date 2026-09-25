const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const {
  getInvoices,
  getInvoice,
} = require("../../controllers/v1/invoiceController.js");

router.get("/get-invoices", protect, adminOnly, getInvoices);
router.get("/get-invoice/:id", protect, adminOnly, getInvoice);

module.exports = router;
