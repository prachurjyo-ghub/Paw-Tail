import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Brand from './src/models/Brand.js';
import Product from './src/models/Product.js';

dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ecommerce");
  const brands = await Brand.find({});
  for (const b of brands) {
    if (b.image && !b.image.startsWith('/uploads/brands/')) {
      await Brand.updateOne({ _id: b._id }, { image: `/uploads/brands/${b.image}` });
    }
  }
  const products = await Product.find({});
  for (const p of products) {
    if (p.imageUrl && !p.imageUrl.startsWith('/uploads/products/')) {
      await Product.updateOne({ _id: p._id }, { imageUrl: `/uploads/products/${p.imageUrl}` });
    }
  }
  console.log("Fixed image paths.");
  process.exit(0);
}
fix();
