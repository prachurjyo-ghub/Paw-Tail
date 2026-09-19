import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  
  const existing = await User.findOne({ email: 'admin@admin.com' });
  if (existing) {
    console.log("Admin already exists.");
  } else {
    const hashedPassword = await bcrypt.hash('Admin@1234', 10);
    await User.create({
      name: 'AdminPra',
      email: 'admin@admin.com',
      phone: '01700000000',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });
    console.log("Created admin user.");
  }
  process.exit(0);
}
run().catch(console.error);
