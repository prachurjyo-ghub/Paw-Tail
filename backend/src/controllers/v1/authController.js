const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const env = require("../../config/env");
const createMailTransporter = require("../../config/mail");
const Order = require("../../models/Order");
const User = require("../../models/User");
const { mediaService } = require("../../services/mediaService");
const { cleanupOldMedia } = require("../../utils/media");

// Utility functions
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  return jwt.sign({ id: userId }, env.refreshTokenSecret, {
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

  user.refreshToken = refreshToken;
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

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    const verificationCode = generateVerificationCode();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      existingUser.name = name;
      existingUser.phone = phone;
      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.otp = verificationCode;
      existingUser.otpExpiresAt = otpExpiresAt;
      await existingUser.save();

      try {
        await sendVerificationEmail(existingUser.email, verificationCode);
      } catch (mailError) {
        mailError.statusCode = 502;
        mailError.message = "Could not send verification email. Please try again.";
        throw mailError;
      }

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        email: existingUser.email,
        message: "Verification code sent to your email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      isVerified: false,
      otp: verificationCode,
      otpExpiresAt,
    });

    try {
      await sendVerificationEmail(normalizedEmail, verificationCode);
    } catch (mailError) {
      mailError.statusCode = 502;
      mailError.message = "Could not send verification email. Please try again.";
      throw mailError;
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    next(error);
  }
};

 // Login controller
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can log in to the admin site",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
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

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No verification code found for this user",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    if (user.otp !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return handleAuthResponse(res, user, 200, "Email verified successfully");
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before resetting your password",
      });
    }

    const resetCode = generateVerificationCode();

    user.otp = resetCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(user.email, resetCode);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
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

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found for this user",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Password reset OTP has expired",
      });
    }

    if (user.otp !== code) {
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

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found for this user",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Password reset OTP has expired",
      });
    }

    if (user.otp !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset OTP",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiresAt = null;
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

    const updateCode = generateVerificationCode();
    user.otp = updateCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
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

    if (!code || !phone) {
      return res.status(400).json({
        success: false,
        message: "OTP code and phone are required",
      });
    }

    const user = req.user;

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this request",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.otp !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.phone = phone;
    user.otp = null;
    user.otpExpiresAt = null;
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

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this request",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.otp !== code) {
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
    user.otp = null;
    user.otpExpiresAt = null;
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
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required",
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this request",
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (user.otp !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const profilePic = user.profilePic;
    await User.deleteOne({ _id: user._id });

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
    next(error);
  }
};

// Logout controller
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const user = await User.findOne({ refreshToken });

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

    const user = await User.findOne({ _id: decoded.id, refreshToken: token });

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
    const accounts = await User.find()
      .select("name email phone role isVerified profilePic address createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

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
