const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes.js");
const brandRoutes = require("./brandRoutes.js");
const orderRoutes = require("./orderRoutes");
const categoryRoutes = require("./categoryRoutes.js");
const productRoutes = require("./productRoutes.js");
const animalRoutes = require("./animalRoutes.js");
const cartRoutes = require("./cartRoutes.js");
const promoCodeRoutes = require("./promoCodeRoutes.js");
const bannerRoutes = require("./bannerRoutes.js");
const reviewRoutes = require("./reviewRoutes.js");
const wishlistRoutes = require("./wishlistRoutes.js");
const deliveryRoutes = require("./deliveryRoutes.js");
const invoiceRoutes = require("./invoiceRoutes.js");
const promoDealRoutes = require("./promoDealRoutes.js");
const inquiryRoutes = require("./inquiryRoutes.js");

router.use("/users", userRoutes);
router.use("/brands", brandRoutes);
router.use("/orders", orderRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/animals", animalRoutes);
router.use("/cart", cartRoutes);
router.use("/promo-codes", promoCodeRoutes);
router.use("/banners", bannerRoutes);
router.use("/reviews", reviewRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/promo-deals", promoDealRoutes);
router.use("/inquiries", inquiryRoutes);

module.exports = router;
