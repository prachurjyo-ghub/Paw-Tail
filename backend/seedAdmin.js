const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || undefined,
});

const User = require("./src/models/User");

const readRequired = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const validateBootstrapConfiguration = () => {
  if (process.env.BOOTSTRAP_ADMIN_ENABLED !== "true") {
    throw new Error(
      "Refusing to bootstrap an administrator unless BOOTSTRAP_ADMIN_ENABLED=true"
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.BOOTSTRAP_ADMIN_ALLOW_PRODUCTION !== "true"
  ) {
    throw new Error(
      "Refusing to bootstrap in production unless BOOTSTRAP_ADMIN_ALLOW_PRODUCTION=true"
    );
  }

  const mongodbUri = readRequired("MONGODB_URI");
  const name = readRequired("BOOTSTRAP_ADMIN_NAME");
  const email = readRequired("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const phone = readRequired("BOOTSTRAP_ADMIN_PHONE");
  const password = readRequired("BOOTSTRAP_ADMIN_PASSWORD");

  if (!/^mongodb(?:\+srv)?:\/\//i.test(mongodbUri)) {
    throw new Error("MONGODB_URI must be a valid MongoDB connection URI");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address");
  }

  if (password.length < 12) {
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters"
    );
  }

  return { mongodbUri, name, email, phone, password };
};

const run = async () => {
  const config = validateBootstrapConfiguration();
  await mongoose.connect(config.mongodbUri);

  const existing = await User.findOne({ email: config.email });
  if (existing) {
    if (existing.role !== "admin") {
      throw new Error(
        "A non-admin user already has BOOTSTRAP_ADMIN_EMAIL; refusing to change its role"
      );
    }

    console.log("Administrator already exists; no changes were made.");
    return;
  }

  const hashedPassword = await bcrypt.hash(config.password, 12);
  await User.create({
    name: config.name,
    email: config.email,
    phone: config.phone,
    password: hashedPassword,
    role: "admin",
    isVerified: true,
  });

  console.log("Administrator created.");
};

run()
  .catch((error) => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
