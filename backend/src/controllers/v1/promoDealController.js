const PromoDeal = require("../../models/PromoDeal");

const getOrCreateDeal = async () => {
  let deal = await PromoDeal.findOne({ key: "homepage" });
  if (!deal) {
    deal = await PromoDeal.create(PromoDeal.getDefaults());
  }
  return deal;
};

const toPublicDeal = (deal) => {
  const obj = deal.toObject ? deal.toObject() : deal;
  const cardA = obj.cardA || {};
  const cardB = obj.cardB || {};
  const activeCards = [];

  if (cardA.isActive) activeCards.push({ key: "A", ...cardA });
  if (cardB.isActive) activeCards.push({ key: "B", ...cardB });

  const deskCodes = [
    ...(cardA.isActive && cardA.code ? [cardA.code] : []),
    ...(cardB.isActive && cardB.code ? [cardB.code] : []),
    ...(obj.thirdCodeActive && obj.thirdCode ? [obj.thirdCode] : []),
  ];

  return {
    sectionKicker: obj.sectionKicker,
    sectionTitle: obj.sectionTitle,
    sectionSubtitle: obj.sectionSubtitle,
    deskTitle: obj.deskTitle,
    deskSubtitle: obj.deskSubtitle,
    thirdCode: obj.thirdCode,
    thirdCodeActive: obj.thirdCodeActive,
    cardA,
    cardB,
    activeCards,
    deskCodes,
    visible: activeCards.length > 0,
    limits: PromoDeal.LIMITS,
  };
};

const getPromoDeals = async (req, res, next) => {
  try {
    const deal = await getOrCreateDeal();
    return res.status(200).json({
      success: true,
      message: "Promo deals fetched successfully",
      promoDeal: toPublicDeal(deal),
    });
  } catch (error) {
    next(error);
  }
};

const getPromoDealsAdmin = async (req, res, next) => {
  try {
    const deal = await getOrCreateDeal();
    return res.status(200).json({
      success: true,
      message: "Promo deals fetched successfully",
      promoDeal: deal,
      limits: PromoDeal.LIMITS,
    });
  } catch (error) {
    next(error);
  }
};

const updatePromoDeals = async (req, res, next) => {
  try {
    const sanitized = PromoDeal.sanitizePayload(req.body);

    if (sanitized.cardA.showCountdown && !sanitized.cardA.endsAt) {
      return res.status(400).json({
        success: false,
        message: "Card A countdown requires an end date",
      });
    }

    if (!sanitized.cardA.title || !sanitized.cardB.title) {
      return res.status(400).json({
        success: false,
        message: "Both card titles are required (even if a card is inactive)",
      });
    }

    const deal = await PromoDeal.findOneAndUpdate(
      { key: "homepage" },
      { $set: sanitized },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Promo deals updated successfully",
      promoDeal: deal,
      limits: PromoDeal.LIMITS,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromoDeals,
  getPromoDealsAdmin,
  updatePromoDeals,
};
