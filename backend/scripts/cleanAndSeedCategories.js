require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Animal = require("../src/models/Animal");
const Category = require("../src/models/Category");

const standardAnimals = [
  { name: "Dog", slug: "dog", icon: "🐶", isActive: true, isDeleted: false },
  { name: "Cat", slug: "cat", icon: "🐱", isActive: true, isDeleted: false },
  { name: "Bird", slug: "bird", icon: "🦜", isActive: true, isDeleted: false },
  { name: "Fish", slug: "fish", icon: "🐠", isActive: true, isDeleted: false },
  { name: "Rabbit", slug: "rabbit", icon: "🐰", isActive: true, isDeleted: false },
  { name: "Small Pets", slug: "small-pets", icon: "🐹", isActive: true, isDeleted: false },
  { name: "Reptile", slug: "reptile", icon: "🦎", isActive: true, isDeleted: false },
];

const testSlugs = ["fardin", "cow", "human", "panda", "test", "test1", "gold-fish"];

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Soft delete test animals
    for (const testSlug of testSlugs) {
      await Animal.updateMany(
        { slug: { $regex: new RegExp(`^${testSlug}$`, "i") } },
        { $set: { isDeleted: true, isActive: false } }
      );
      await Category.updateMany(
        { animalName: { $regex: new RegExp(`^${testSlug}$`, "i") } },
        { $set: { isDeleted: true, isActive: false } }
      );
    }

    // Inspect existing animals
    const allAnimals = await Animal.find({}).setOptions({ withDeleted: true });

    // Handle soft-deleted animals with duplicate slugs so unique index doesn't conflict
    for (const a of allAnimals) {
      if (a.isDeleted && !a.slug.includes("_deleted_")) {
        await Animal.updateOne({ _id: a._id }, { $set: { slug: `${a.slug}_deleted_${a._id}` } });
      }
    }

    // Now upsert standard animals
    for (const item of standardAnimals) {
      const existing = await Animal.findOne({
        $or: [
          { slug: item.slug },
          { name: { $regex: new RegExp(`^${item.name}$`, "i") }, isDeleted: false }
        ]
      }).setOptions({ withDeleted: true });

      if (existing) {
        await Animal.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: item.name,
              slug: item.slug,
              icon: item.icon,
              image: null,
              isActive: true,
              isDeleted: false,
            }
          }
        );
      } else {
        await Animal.create(item);
      }
    }

    console.log("Seeded standard pet categories successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error cleaning/seeding categories:", err);
    process.exit(1);
  }
}

run();
