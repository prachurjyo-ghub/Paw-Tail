const Review = require("../models/Review");

const BASELINE = { averageRating: 5, reviewCount: 1, isBaseline: true };

async function getRatingMapForProductIds(productIds = []) {
  const ids = productIds
    .map((id) => id?.toString?.() || id)
    .filter(Boolean);

  if (!ids.length) return new Map();

  const rows = await Review.aggregate([
    {
      $match: {
        product: { $in: ids.map((id) => new (require("mongoose").Types.ObjectId)(id)) },
        isHidden: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), {
      averageRating: Math.round(Number(row.averageRating || 0) * 10) / 10,
      reviewCount: row.reviewCount,
      isBaseline: false,
    });
  });
  return map;
}

function withBaseline(stats) {
  if (!stats || !stats.reviewCount) {
    return { ...BASELINE };
  }
  return stats;
}

async function attachRatingsToProducts(products = []) {
  const list = Array.isArray(products) ? products : [];
  const ids = list.map((p) => p._id || p.id).filter(Boolean);
  const map = await getRatingMapForProductIds(ids);

  return list.map((product) => {
    const plain = product.toObject ? product.toObject() : { ...product };
    const stats = withBaseline(map.get(String(plain._id)));
    return {
      ...plain,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
      isBaselineRating: stats.isBaseline,
    };
  });
}

async function getProductRating(productId) {
  const map = await getRatingMapForProductIds([productId]);
  return withBaseline(map.get(String(productId)));
}

module.exports = {
  BASELINE,
  attachRatingsToProducts,
  getProductRating,
  getRatingMapForProductIds,
};
