const assert = require("node:assert/strict");
const test = require("node:test");

const Review = require("../src/models/Review");
const { BASELINE, getRatingMapForProductIds } = require("../src/utils/reviewRatings");

test("rating lookup ignores malformed and duplicate product IDs", async () => {
  const originalAggregate = Review.aggregate;
  const validId = "507f1f77bcf86cd799439011";

  Review.aggregate = async (pipeline) => {
    assert.equal(pipeline[0].$match.product.$in.length, 1);
    assert.equal(String(pipeline[0].$match.product.$in[0]), validId);
    assert.deepEqual(pipeline[0].$match.status, { $in: ["approved", "replied"] });
    return [];
  };

  try {
    const result = await getRatingMapForProductIds([
      "not-an-object-id",
      validId,
      validId,
    ]);
    assert.equal(result.size, 0);
  } finally {
    Review.aggregate = originalAggregate;
  }
});

test("products without approved reviews have an honest zero rating", () => {
  assert.deepEqual(BASELINE, { averageRating: 0, reviewCount: 0, isBaseline: false });
});
