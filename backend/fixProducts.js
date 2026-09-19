import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ecommerce";

async function fix() {
  await mongoose.connect(MONGODB_URI);
  const products = await Product.find({});
  for (const p of products) {
    if (p.slug === 'cat-tuna-treat-pack') {
      p.images = ['/uploads/products/1788249027923-product-tuna.jpg'];
    } else if (p.slug === 'bird-seed-mix-1kg') {
      p.images = ['/uploads/products/1788249027485-product-birdseed.jpg'];
    } else if (p.slug === 'premium-dog-food-5kg') {
      p.images = ['/uploads/products/1788249027627-product-dogfood.jpg'];
    } else if (p.slug === 'rabbit-chew-toys') {
      p.images = ['/uploads/products/1788249027773-product-rabbit.jpg'];
    } else if (p.slug === 'deluxe-cat-scratching-post') {
      p.images = ['/uploads/products/1788249027923-product-tuna.jpg'];
    }
    await p.save();
  }
  console.log("Fixed product images.");
  process.exit(0);
}
fix();
