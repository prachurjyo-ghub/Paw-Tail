/**
 * One-time: mark existing reviews as approved so the storefront
 * does not go empty after enabling moderation.
 *
 * Usage: node scripts/approveLegacyReviews.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("../src/models/Review");

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI missing in .env");
  }

  await mongoose.connect(uri);

  const result = await Review.updateMany(
    {
      $or: [
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
        { approvalStatus: "pending", isActive: true },
      ],
    },
    {
      $set: {
        approvalStatus: "approved",
        isActive: true,
      },
    }
  );

  console.log("Legacy reviews approved:", result.modifiedCount);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
