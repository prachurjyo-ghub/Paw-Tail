import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Brand from './src/models/Brand.js';
import Product from './src/models/Product.js';
import Category from './src/models/Category.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ecommerce";

const icons = {
  bird: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 4c6 3 10 9 10 16-6 0-10-3-12-8 0 6-2 10-8 14 1-8 4-14 10-22z" fill="#173f31"/></svg>',
  fish: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 16c4-8 16-8 20 0-4 8-16 8-20 0z" fill="#173f31"/><circle cx="20" cy="15" r="1.6" fill="#eef6f1"/></svg>',
  dog: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="20.5" rx="7" ry="5.5" fill="#173f31"/><circle cx="8.5" cy="13" r="2.7" fill="#173f31"/><circle cx="13.2" cy="9.2" r="2.7" fill="#173f31"/><circle cx="18.8" cy="9.2" r="2.7" fill="#173f31"/><circle cx="23.5" cy="13" r="2.7" fill="#173f31"/></svg>',
  cat: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 14l4-8 6 6 6-6 4 8v8a10 10 0 0 1-20 0v-8z" fill="#173f31"/><circle cx="12" cy="18" r="1.3" fill="#eef6f1"/><circle cx="20" cy="18" r="1.3" fill="#eef6f1"/></svg>',
  rabbit: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="8" rx="3" ry="7" fill="#173f31"/><ellipse cx="18" cy="8" rx="3" ry="7" fill="#173f31"/><circle cx="16" cy="20" r="8" fill="#173f31"/></svg>',
  multi: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 26s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z" fill="#173f31"/></svg>',
  groom: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 6h4v20H8zM16 10h4v16h-4zM24 14h4v12h-4z" fill="#173f31"/></svg>'
};

const brandsData = [
  { name: "FeatherFlex", pets: "Bird", icon: "bird" },
  { name: "AquaNest", pets: "Fish", icon: "fish" },
  { name: "Paw Pro", pets: "Dog", icon: "dog" },
  { name: "Smart Hear", pets: "Dog, cat, rabbit", icon: "multi" },
  { name: "Whisker & Co", pets: "Cat", icon: "cat" },
  { name: "Hutch Club", pets: "Rabbit", icon: "rabbit" },
  { name: "Song & Seed", pets: "Bird", icon: "bird" },
  { name: "Reef & Fin", pets: "Fish", icon: "fish" },
  { name: "TrailBone", pets: "Dog", icon: "dog" },
  { name: "PurrMaison", pets: "Cat", icon: "cat" },
  { name: "NibbleNest", pets: "Rabbit", icon: "rabbit" },
  { name: "CoatCare", pets: "Grooming", icon: "groom" }
];

const productsData = [
  {
    name: "Cat Tuna Treat Pack",
    categoryLabel: "Cat · 100g",
    price: 400,
    oldPrice: 450,
    discount: "−11%",
    image: "product-tuna.jpg",
    badge: "Sale",
    stock: 50,
    brandName: "Whisker & Co"
  },
  {
    name: "Bird Seed Mix 1kg",
    categoryLabel: "Bird · 1kg",
    price: 250,
    image: "product-birdseed.jpg",
    badge: "New",
    stock: 50,
    brandName: "Song & Seed"
  },
  {
    name: "Premium Dog Food 5kg",
    categoryLabel: "Dog · 5kg",
    price: 1500,
    image: "product-dogfood.jpg",
    badge: "New",
    stock: 50,
    brandName: "Paw Pro"
  },
  {
    name: "Rabbit Chew Toys",
    categoryLabel: "Rabbit · set",
    price: 300,
    image: "product-rabbit.jpg",
    badge: "New",
    stock: 15,
    brandName: "Hutch Club"
  },
  // Add a 5th product so 5 show in the featured row
  {
    name: "Deluxe Cat Scratching Post",
    categoryLabel: "Cat · Toy",
    price: 850,
    image: "product-tuna.jpg", // reuse image since we only have 4 product images
    badge: "Sale",
    stock: 20,
    brandName: "PurrMaison"
  }
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Ensure directories exist
  const brandsUploadDir = path.join(process.cwd(), 'uploads', 'brands');
  const productsUploadDir = path.join(process.cwd(), 'uploads', 'products');
  fs.mkdirSync(brandsUploadDir, { recursive: true });
  fs.mkdirSync(productsUploadDir, { recursive: true });

  // Delete existing bypassing mongoose middleware
  await Brand.collection.deleteMany({});
  await Product.collection.deleteMany({});
  console.log("Cleared old Brands and Products.");

  // Save icons and create brands
  for (const b of brandsData) {
    const filename = `icon-${b.icon}.svg`;
    const filepath = path.join(brandsUploadDir, filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, icons[b.icon], 'utf-8');
    }

    const animalNames = b.pets.split(",").map(s => s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase());
    
    await Brand.create({
      name: b.name,
      slug: b.name.toLowerCase().replace(/\\s+/g, '-').replace(/&/g, 'and'),
      animalNames: animalNames,
      image: `/uploads/brands/${filename}`,
    });
  }
  console.log(`Created ${brandsData.length} brands.`);

  // Create products
  const refAssetsDir = path.join(process.cwd(), '..', 'feature products and popular brands', 'assets');
  
  // Create a default category to satisfy the schema requirement
  let defaultCategory = await Category.findOne({ name: "Pet Supplies" });
  if (!defaultCategory) {
    defaultCategory = await Category.create({
      name: "Pet Supplies",
      slug: "pet-supplies",
      description: "General pet supplies",
      animalName: "Multi"
    });
  }

  for (const p of productsData) {
    // Copy image
    const sourcePath = path.join(refAssetsDir, p.image);
    const destName = `${Date.now()}-${p.image}`;
    const destPath = path.join(productsUploadDir, destName);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
    } else {
      console.log(`Warning: Missing image ${sourcePath}`);
    }

    const brand = await Brand.findOne({ name: p.brandName });
    
    await Product.create({
      name: p.name,
      slug: p.name.toLowerCase().replace(/\\s+/g, '-'),
      brand: brand?._id || null,
      category: defaultCategory._id,
      description: "Premium quality item for your pet.",
      price: p.price,
      oldPrice: p.oldPrice || null,
      discount: p.discount || "",
      stockQuantity: p.stock,
      images: [`/uploads/products/${destName}`],
      badges: p.badge ? [p.badge] : [],
      isFeatured: true,
      subcategory: p.categoryLabel, // store the custom label here for the frontend to display
      ratingCount: Math.floor(Math.random() * 50) + 10,
      variants: [],
      hasVariants: false,
      isOutOfStock: false
    });
  }
  console.log(`Created ${productsData.length} products.`);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch(console.error);
