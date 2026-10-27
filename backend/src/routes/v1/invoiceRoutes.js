const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../../middleware/auth.middleware.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getInvoices,
  getInvoice,
} = require("../../controllers/v1/invoiceController.js");

router.get("/get-invoices", protect, adminOnly, policies.admin, getInvoices);
router.get("/get-invoice/:id", protect, adminOnly, policies.admin, getInvoice);

module.exports = router;
