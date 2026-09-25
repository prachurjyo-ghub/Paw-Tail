const mongoose = require("mongoose");

const LIMITS = {
  sectionKicker: 24,
  sectionTitle: 40,
  sectionSubtitle: 120,
  kicker: 36,
  title: 28,
  description: 120,
  code: 16,
  amountLabel: 8,
  amountSuffix: 16,
  buttonLabel: 22,
  buttonHref: 200,
  stampRingText: 60,
  barcodeLabel: 20,
  deskTitle: 32,
  deskSubtitle: 80,
  thirdCode: 16,
};

const clip = (value, max, fallback = "") => {
  const text = String(value ?? fallback).trim();
  return text.slice(0, max);
};

const cardSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    kicker: { type: String, default: "", trim: true, maxlength: LIMITS.kicker },
    title: { type: String, default: "", trim: true, maxlength: LIMITS.title },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.description,
    },
    code: { type: String, default: "", trim: true, maxlength: LIMITS.code },
    amountLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.amountLabel,
    },
    amountSuffix: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.amountSuffix,
    },
    buttonLabel: {
      type: String,
      default: "Shop now",
      trim: true,
      maxlength: LIMITS.buttonLabel,
    },
    buttonHref: {
      type: String,
      default: "/categories",
      trim: true,
      maxlength: LIMITS.buttonHref,
    },
    stampRingText: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.stampRingText,
    },
    barcodeLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.barcodeLabel,
    },
    endsAt: { type: Date, default: null },
    showCountdown: { type: Boolean, default: false },
  },
  { _id: false }
);

const promoDealSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "homepage",
      unique: true,
      index: true,
    },
    sectionKicker: {
      type: String,
      default: "Deals & vouchers",
      maxlength: LIMITS.sectionKicker,
    },
    sectionTitle: {
      type: String,
      default: "Paw-some deals this week",
      maxlength: LIMITS.sectionTitle,
    },
    sectionSubtitle: {
      type: String,
      default:
        "Two limited-time treats and a voucher counter — tap a code to copy it, or redeem your own at the desk below.",
      maxlength: LIMITS.sectionSubtitle,
    },
    cardA: { type: cardSchema, default: () => ({}) },
    cardB: { type: cardSchema, default: () => ({}) },
    deskTitle: {
      type: String,
      default: "Have a voucher code?",
      maxlength: LIMITS.deskTitle,
    },
    deskSubtitle: {
      type: String,
      default: "Redeem it at the counter — discounts stack with sale prices.",
      maxlength: LIMITS.deskSubtitle,
    },
    thirdCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: LIMITS.thirdCode,
    },
    thirdCodeActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const defaultEndsAt = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

promoDealSchema.statics.getDefaults = function getDefaults() {
  return {
    key: "homepage",
    sectionKicker: "Deals & vouchers",
    sectionTitle: "Paw-some deals this week",
    sectionSubtitle:
      "Two limited-time treats and a voucher counter — tap a code to copy it, or redeem your own at the desk below.",
    cardA: {
      isActive: true,
      kicker: "Limited time · Monsoon deal",
      title: "Monsoon Pet Fest",
      description:
        "Rainy-day beds, flea care & fishy favourites — up to 30% off storewide while the clouds play.",
      code: "PAWMON30",
      amountLabel: "30%",
      amountSuffix: "",
      buttonLabel: "Shop the sale",
      buttonHref: "/categories",
      stampRingText: "PAWTAIL DEAL • MONSOON FEST • PAWTAIL DEAL •",
      barcodeLabel: "PAW·MON·30",
      endsAt: defaultEndsAt(),
      showCountdown: true,
    },
    cardB: {
      isActive: true,
      kicker: "Weekend only",
      title: "Free Shipping Weekend",
      description:
        "Every order, every district — no minimum spend, Friday to Sunday.",
      code: "FREESHIP",
      amountLabel: "৳0",
      amountSuffix: "delivery",
      buttonLabel: "Order now",
      buttonHref: "/categories",
      stampRingText: "FREE DELIVERY • FRI–SUN • FREE DELIVERY •",
      barcodeLabel: "PAW·SHIP·00",
      endsAt: null,
      showCountdown: false,
    },
    deskTitle: "Have a voucher code?",
    deskSubtitle: "Redeem it at the counter — discounts stack with sale prices.",
    thirdCode: "NEWPAW500",
    thirdCodeActive: true,
  };
};

promoDealSchema.statics.sanitizePayload = function sanitizePayload(payload = {}) {
  const defaults = this.getDefaults();
  const source = payload || {};

  const sanitizeCard = (card = {}, fallback = {}) => ({
    isActive: card.isActive !== undefined ? Boolean(card.isActive) : fallback.isActive,
    kicker: clip(card.kicker, LIMITS.kicker, fallback.kicker),
    title: clip(card.title, LIMITS.title, fallback.title),
    description: clip(card.description, LIMITS.description, fallback.description),
    code: clip(card.code, LIMITS.code, fallback.code).toUpperCase(),
    amountLabel: clip(card.amountLabel, LIMITS.amountLabel, fallback.amountLabel),
    amountSuffix: clip(card.amountSuffix, LIMITS.amountSuffix, fallback.amountSuffix),
    buttonLabel: clip(card.buttonLabel, LIMITS.buttonLabel, fallback.buttonLabel),
    buttonHref: clip(card.buttonHref, LIMITS.buttonHref, fallback.buttonHref) || "/categories",
    stampRingText: clip(card.stampRingText, LIMITS.stampRingText, fallback.stampRingText),
    barcodeLabel: clip(card.barcodeLabel, LIMITS.barcodeLabel, fallback.barcodeLabel),
    endsAt: card.endsAt ? new Date(card.endsAt) : fallback.endsAt || null,
    showCountdown:
      card.showCountdown !== undefined
        ? Boolean(card.showCountdown)
        : Boolean(fallback.showCountdown),
  });

  return {
    key: "homepage",
    sectionKicker: clip(source.sectionKicker, LIMITS.sectionKicker, defaults.sectionKicker),
    sectionTitle: clip(source.sectionTitle, LIMITS.sectionTitle, defaults.sectionTitle),
    sectionSubtitle: clip(
      source.sectionSubtitle,
      LIMITS.sectionSubtitle,
      defaults.sectionSubtitle
    ),
    cardA: sanitizeCard(source.cardA, defaults.cardA),
    cardB: sanitizeCard(source.cardB, defaults.cardB),
    deskTitle: clip(source.deskTitle, LIMITS.deskTitle, defaults.deskTitle),
    deskSubtitle: clip(source.deskSubtitle, LIMITS.deskSubtitle, defaults.deskSubtitle),
    thirdCode: clip(source.thirdCode, LIMITS.thirdCode, defaults.thirdCode).toUpperCase(),
    thirdCodeActive:
      source.thirdCodeActive !== undefined
        ? Boolean(source.thirdCodeActive)
        : defaults.thirdCodeActive,
  };
};

promoDealSchema.statics.LIMITS = LIMITS;

module.exports = mongoose.model("PromoDeal", promoDealSchema);
