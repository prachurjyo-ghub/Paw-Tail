const { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } = require("crypto");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const env = require("../../config/env");
const createMailTransporter = require("../../config/mail");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Cart = require("../../models/Cart");
const Inquiry = require("../../models/Inquiry");
const Review = require("../../models/Review");
const { mediaService } = require("../../services/mediaService");
const { cleanupOldMedia } = require("../../utils/media");
const logger = require("../../utils/logger");

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = "$2b$10$3euPcmQFCiblsZeEu5s7p.9Wf2XHX3QYZTHwRs8hG3Nq6M3j6Yw6S";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const hashRefreshToken = (token) =>
  createHash("sha256").update(token).digest("hex");
const hashOtp = (email, purpose, code) =>
  createHmac("sha256", env.accessTokenSecret)
    .update(`${normalizeEmail(email)}:${purpose}:${code}`)
    .digest("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
};
const assignOtp = (user, code, purpose) => {
  user.otp = hashOtp(user.email, purpose, code);
  user.otpPurpose = purpose;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
};
const clearOtp = (user) => {
  user.otp = null;
  user.otpExpiresAt = null;
  user.otpPurpose = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
};
const verifyOtp = async (user, code, purpose) => {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  if (!user.otp || !user.otpExpiresAt || user.otpPurpose !== purpose) return false;
  if (user.otpExpiresAt.getTime() < Date.now() || user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    clearOtp(user);
    await user.save();
    return false;
  }
  const valid = safeEqual(user.otp, hashOtp(user.email, purpose, code));
  if (!valid) {
    user.otpAttempts += 1;
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) clearOtp(user);
    await user.save();
  }
  return valid;
};
const canResendOtp = (user) =>
  !user.otpLastSentAt || Date.now() - user.otpLastSentAt.getTime() >= OTP_RESEND_COOLDOWN_MS;
const isStrongPassword = (value) =>
  typeof value === "string" && value.length >= 12 && value.length <= 128;

// Utility functions
const generateVerificationCode = () => {
  return randomInt(100000, 1000000).toString();
};

const parseDurationToMs = (duration, fallbackMs) => {
  if (!duration) {
    return fallbackMs;
  }

  const match = String(duration).trim().match(/^(\d+(?:\.\d+)?)([smhd])$/i);

  if (!match) {
    return fallbackMs;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Math.round(value * units[unit]);
};

const ACCESS_TOKEN_MAX_AGE_MS = parseDurationToMs(
  env.accessTokenExpiresIn,
  60 * 60 * 1000
);
const REFRESH_TOKEN_MAX_AGE_MS = parseDurationToMs(
  env.refreshTokenExpiresIn,
  60 * 60 * 1000
);

// Token generation functions
const createAccessToken = (userId) => {
  return jwt.sign({ id: userId }, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });
};

// Refresh token generation function
const createRefreshToken = (userId) => {
  return jwt.sign({ id: userId, jti: randomBytes(16).toString("hex") }, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });
};

// Cookie options function
const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  maxAge,
  path: "/",
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  path: "/",
});

// Function to send verification email

const sendVerificationEmail = async (email, code) => {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: env.mailFrom,
    to: email,
    subject: "Verify your email",
    text: `Your verification code is ${code}. This code will expire in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code will expire in 10 minutes.</p>`,
  });
};

const sendPasswordResetEmail = async (email, code) => {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: env.mailFrom,
    to: email,
    subject: "Reset your password",
    text: `Your password reset code is ${code}. This code will expire in 10 minutes.`,
    html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>This code will expire in 10 minutes.</p>`,
  });
};

const sendAccountUpdateEmail = async (email, code) => {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: env.mailFrom,
    to: email,
    subject: "Confirm your account update",
    text: `Your account update code is ${code}. This code will expire in 10 minutes.`,
    html: `<p>Your account update code is <strong>${code}</strong>.</p><p>This code will expire in 10 minutes.</p>`,
  });
};

// Common function to handle authentication responses
const handleAuthResponse = async (res, user, statusCode, message) => {
  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);

  user.refreshToken = hashRefreshToken(refreshToken);
  await user.save();

  res.cookie(
    "accessToken",
    accessToken,
    cookieOptions(ACCESS_TOKEN_MAX_AGE_MS)
  );

  res.cookie(
    "refreshToken",
    refreshToken,
    cookieOptions(REFRESH_TOKEN_MAX_AGE_MS)
  );

  return res.status(statusCode).json({
    success: true,
    message,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      profilePic: user.profilePic,
      address: user.address || [],
      createdAt: user.createdAt,
    },
  });
};

// Signup controller
const signup = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (
      typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100 ||
      !EMAIL_PATTERN.test(normalizedEmail) ||
      typeof phone !== "string" || phone.trim().length < 7 || phone.trim().length > 30 ||
      !isStrongPassword(password)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid name, email, phone, and password of 12-128 characters",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    const verificationCode = generateVerificationCode();

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(200).json({
          success: true,
          requiresVerification: true,
          email: normalizedEmail,
          message: "If the account can be registered, a verification email will be sent",
        });
      }

      if (!canResendOtp(existingUser)) {
        return res.status(429).json({ success: false, message: "Please wait before requesting another code" });
      }

      existingUser.name = name.trim();
      existingUser.phone = phone.trim();
      existingUser.password = await bcrypt.hash(password, 10);
      assignOtp(existingUser, verificationCode, "verify-email");
      await existingUser.save();

      try {
        await sendVerificationEmail(existingUser.email, verificationCode);
      } catch (mailError) {
        logger.error("auth.verification_mail_failed", { message: mailError.message });
      }

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        email: existingUser.email,
        message: "If the account can be registered, a verification email will be sent",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      isVerified: false,
      otp: hashOtp(normalizedEmail, "verify-email", verificationCode),
      otpPurpose: "verify-email",
      otpAttempts: 0,
      otpLastSentAt: new Date(),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    try {
      await sendVerificationEmail(normalizedEmail, verificationCode);
    } catch (mailError) {
      logger.error("auth.verification_mail_failed", { message: mailError.message });
    }

    return res.status(200).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: "If the account can be registered, a verification email will be sent",
    });
  } catch (error) {
    next(error);
  }
};

 // Login controller
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return handleAuthResponse(res, user, 200, "Login successful");
  } catch (error) {
    next(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched || user.role !== "admin" || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return handleAuthResponse(res, user, 200, "Admin login successful");
  } catch (error) {
    next(error);
  }
};
 // Verify email controller
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!EMAIL_PATTERN.test(normalizedEmail) || !/^\d{6}$/.test(String(code || ""))) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    if (!(await verifyOtp(user, code, "verify-email"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    user.isVerified = true;
    clearOtp(user);
    await user.save();

    return handleAuthResponse(res, user, 200, "Email verified successfully");
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const genericResponse = {
      success: true,
      message: "If an eligible account exists, a password reset code will be sent",
    };

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isVerified || !canResendOtp(user)) {
      return res.status(200).json(genericResponse);
    }

    const resetCode = generateVerificationCode();

    assignOtp(user, resetCode, "reset-password");
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetCode);
    } catch (mailError) {
      logger.error("auth.password_reset_mail_failed", { message: mailError.message });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and reset code are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset OTP",
      });
    }

    if (!(await verifyOtp(user, code, "reset-password"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalizedEmail) || !/^\d{6}$/.test(String(code || "")) || !isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset OTP",
      });
    }

    if (!(await verifyOtp(user, code, "reset-password"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset OTP",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearOtp(user);
    user.refreshToken = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

const requestUpdateOtp = async (req, res, next) => {
  try {
    const { type } = req.body;

    if (!type || !["phone", "password", "delete"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "A valid update type is required",
      });
    }

    const user = req.user;

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before requesting account updates",
      });
    }

    if (!canResendOtp(user)) {
      return res.status(429).json({ success: false, message: "Please wait before requesting another code" });
    }

    const updateCode = generateVerificationCode();
    assignOtp(user, updateCode, type);
    await user.save();

    await sendAccountUpdateEmail(user.email, updateCode);

    return res.status(200).json({
      success: true,
      message: `OTP sent to your email for ${type} update`,
    });
  } catch (error) {
    next(error);
  }
};

const updatePhone = async (req, res, next) => {
  try {
    const { code, phone } = req.body;

    if (!/^\d{6}$/.test(String(code || "")) || typeof phone !== "string" || phone.trim().length < 7 || phone.trim().length > 30) {
      return res.status(400).json({
        success: false,
        message: "OTP code and phone are required",
      });
    }

    const user = req.user;

    if (!(await verifyOtp(user, code, "phone"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.phone = String(phone).trim();
    clearOtp(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        profilePic: user.profilePic,
        address: user.address || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { code, currentPassword, newPassword } = req.body;

    if (!code || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "OTP code, current password, and new password are required",
      });
    }

    const user = req.user;

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ success: false, message: "New password must contain 12-128 characters" });
    }

    if (!(await verifyOtp(user, code, "password"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const isPasswordMatched = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearOtp(user);
    user.refreshToken = null;
    await user.save();

    res.clearCookie("accessToken", clearCookieOptions());
    res.clearCookie("refreshToken", clearCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
};

const uploadProfileImage = async (req, res, next) => {
  let newImage = null;
  let databaseSaved = false;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const user = req.user;
    const previousProfilePic = user.profilePic;
    newImage = await mediaService.uploadImage(req.file, "users");

    user.profilePic = newImage;
    await user.save();
    databaseSaved = true;

    if (previousProfilePic) {
      await cleanupOldMedia([previousProfilePic], {
        legacyFolder: "users",
        requestId: req.requestId,
        resource: "users",
        entityId: user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      profilePic: user.profilePic,
    });
  } catch (error) {
    if (newImage && !databaseSaved) {
      await mediaService
        .destroyMedia(newImage, {
          requestId: req.requestId,
          resource: "users",
        })
        .catch(() => undefined);
    }
    next(error);
  }
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  profilePic: user.profilePic,
  address: user.address || [],
  createdAt: user.createdAt,
});

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const normalizeAddress = (address, fallbackId) => ({
  id: address.id || fallbackId || `addr_${Date.now()}`,
  label: String(address.label || "Home").trim(),
  name: String(address.name || "").trim(),
  phone: String(address.phone || "").trim(),
  line: String(address.line || address.address || "").trim(),
  area: String(address.area || "").trim(),
  city: String(address.city || "").trim(),
  postal: String(address.postal || address.postalCode || "").trim(),
  isDefault: Boolean(address.isDefault),
});

const validateAddress = (address) => {
  const required = ["label", "name", "phone", "line", "area", "city"];
  return required.every((field) => address[field]);
};

const addAddress = async (req, res, next) => {
  try {
    const user = req.user;
    const address = normalizeAddress(req.body);

    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Label, name, phone, address, area, and city are required",
      });
    }

    const addresses = user.address || [];
    if (!addresses.length || address.isDefault) {
      addresses.forEach((item) => {
        item.isDefault = false;
      });
      address.isDefault = true;
    }

    addresses.push(address);
    user.address = addresses;
    user.markModified("address");
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: user.address,
    });
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = req.user;
    const addresses = user.address || [];
    const index = addresses.findIndex((address) => address.id === addressId);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const updatedAddress = normalizeAddress(
      { ...addresses[index], ...req.body, id: addressId },
      addressId
    );

    if (!validateAddress(updatedAddress)) {
      return res.status(400).json({
        success: false,
        message: "Label, name, phone, address, area, and city are required",
      });
    }

    if (updatedAddress.isDefault) {
      addresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    addresses[index] = updatedAddress;

    if (!addresses.some((address) => address.isDefault) && addresses[0]) {
      addresses[0].isDefault = true;
    }

    user.address = addresses;
    user.markModified("address");
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: user.address,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = req.user;
    const addresses = user.address || [];
    const filtered = addresses.filter((address) => address.id !== addressId);

    if (filtered.length === addresses.length) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (filtered.length && !filtered.some((address) => address.isDefault)) {
      filtered[0].isDefault = true;
    }

    user.address = filtered;
    user.markModified("address");
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.address,
    });
  } catch (error) {
    next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = req.user;
    const addresses = user.address || [];

    if (!addresses.some((address) => address.id === addressId)) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    user.address = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }));
    user.markModified("address");
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      addresses: user.address,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required",
      });
    }

    if (!(await verifyOtp(user, code, "delete"))) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const profilePic = user.profilePic;
    session.startTransaction();
    await Promise.all([
      Cart.deleteMany({ user: user._id }, { session }),
      Inquiry.deleteMany({ $or: [{ user: user._id }, { email: user.email }] }, { session }),
      Review.updateMany(
        { user: user._id },
        { $set: { user: null, customerName: "Deleted customer" } },
        { session }
      ),
      Order.updateMany(
        { user: user._id },
        {
          $set: {
            "userInfo.name": "Deleted customer",
            "userInfo.email": "deleted@invalid.local",
            "userInfo.phone": "redacted",
            "shippingAddress.name": "Deleted customer",
            "shippingAddress.phone": "redacted",
            "shippingAddress.city": "redacted",
            "shippingAddress.area": "redacted",
            "shippingAddress.address": "redacted",
            "shippingAddress.postalCode": null,
          },
        },
        { session }
      ),
    ]);

    user.name = "Deleted customer";
    user.email = `deleted-${user._id}@invalid.local`;
    user.phone = null;
    user.password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    user.profilePic = null;
    user.address = [];
    user.wishList = [];
    user.refreshToken = null;
    user.isVerified = false;
    user.isDeleted = true;
    user.deletedAt = new Date();
    clearOtp(user);
    await user.save({ session });
    await session.commitTransaction();

    if (profilePic) {
      await cleanupOldMedia([profilePic], {
        legacyFolder: "users",
        requestId: req.requestId,
        resource: "users",
        entityId: user._id,
      });
    }

    res.clearCookie("accessToken", clearCookieOptions());
    res.clearCookie("refreshToken", clearCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Logout controller
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const user = await User.findOne({ refreshToken: hashRefreshToken(refreshToken) });

      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie("accessToken", clearCookieOptions());
    res.clearCookie("refreshToken", clearCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, env.refreshTokenSecret);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const currentTokenHash = hashRefreshToken(token);
    const nextRefreshToken = createRefreshToken(decoded.id);
    const user = await User.findOneAndUpdate(
      { _id: decoded.id, refreshToken: currentTokenHash },
      { $set: { refreshToken: hashRefreshToken(nextRefreshToken) } },
      { new: true }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid",
      });
    }

    const accessToken = createAccessToken(user._id);

    res.cookie(
      "accessToken",
      accessToken,
      cookieOptions(ACCESS_TOKEN_MAX_AGE_MS)
    );
    res.cookie(
      "refreshToken",
      nextRefreshToken,
      cookieOptions(REFRESH_TOKEN_MAX_AGE_MS)
    );

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res) => {
  const user = req.user;

  return res.status(200).json({
    success: true,
    user: serializeUser(user),
  });
};

const getAccounts = async (req, res, next) => {
  try {
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
    const accountFilter = { isDeleted: { $ne: true } };
    const [accounts, total] = await Promise.all([User.find(accountFilter)
      .select("name email phone role isVerified profilePic address createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(accountFilter)]);

    return res.status(200).json({
      success: true,
      message: "Accounts fetched successfully",
      accounts: accounts.map((account) => ({
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        isVerified: account.isVerified,
        profilePic: account.profilePic,
        addressCount: Array.isArray(account.address) ? account.address.length : 0,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getAccountDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid account id is required",
      });
    }

    const account = await User.findById(id)
      .select("name email phone role isVerified profilePic address createdAt updatedAt")
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const orders = await Order.find({ user: account._id }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Account details fetched successfully",
      account: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        isVerified: account.isVerified,
        profilePic: account.profilePic,
        address: account.address || [],
        addressCount: Array.isArray(account.address) ? account.address.length : 0,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  signup,
  login,
  adminLogin,
  verifyEmail,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  requestUpdateOtp,
  updatePhone,
  changePassword,
  uploadProfileImage,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deleteAccount,
  logout,
  refreshToken,
  getCurrentUser,
  getAccounts,
  getAccountDetails,
};
