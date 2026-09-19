const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Brand = require("./src/models/Brand");
const Animal = require("./src/models/Animal");

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Fetch existing categories, brands, animals to use
    const category = await Category.findOne({});
    const brand = await Brand.findOne({});
    const animal = await Animal.findOne({});

    if (!category || !brand || !animal) {
      console.log("Please create at least one category, brand, and animal in the admin panel first.");
      process.exit(1);
    }

    const testProducts = [
      {
        name: "Premium Dog Food 5kg",
        slug: "premium-dog-food-5kg-" + Date.now(),
        description: "High quality premium dog food enriched with vitamins.",
        price: 1500,
        stockQuantity: 50,
        isFeatured: true,
        isOfferEnabled: false,
        category: category._id,
        brand: brand._id,
        animal: animal._id,
        images: ["/uploads/products/premium_dog_food.jpg"]
      },
      {
        name: "Cat Tuna Treat Pack",
        slug: "cat-tuna-treat-pack-" + Date.now(),
        description: "Delicious tuna treats for your beloved feline.",
        price: 450,
        discountPrice: 400,
        discountPercentage: 11,
        stockQuantity: 100,
        isFeatured: true,
        isOfferEnabled: true,
        category: category._id,
        brand: brand._id,
        animal: animal._id,
        images: ["/uploads/products/cat_tuna_treats.jpg"]
      },
      {
        name: "Bird Seed Mix 1kg",
        slug: "bird-seed-mix-1kg-" + Date.now(),
        description: "Nutritious seed mix for small to medium birds.",
        price: 250,
        stockQuantity: 200,
        isFeatured: true,
        isOfferEnabled: false,
        category: category._id,
        brand: brand._id,
        animal: animal._id,
        images: ["/uploads/products/bird_seed_mix.jpg"]
      },
      {
        name: "Rabbit Chew Toys",
        slug: "rabbit-chew-toys-" + Date.now(),
        description: "Safe wooden chew toys for rabbits to keep their teeth healthy.",
        price: 300,
        stockQuantity: 15,
        isFeatured: true,
        isOfferEnabled: false,
        category: category._id,
        brand: brand._id,
        animal: animal._id,
        images: ["/uploads/products/rabbit_chew_toys.jpg"]
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(testProducts);
    console.log("Successfully cleared old products and seeded 4 new featured products with high-quality images!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedProducts();
