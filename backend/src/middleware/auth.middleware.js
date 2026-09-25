const jwt = require("jsonwebtoken");

const env = require("../config/env");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, env.accessTokenSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.accessTokenSecret);
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
    return next();
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          allowedRoles.length === 1 && allowedRoles[0] === "admin"
            ? "Admin access only"
            : "You are not allowed to access this resource",
      });
    }

    next();
  };
};

const admin = authorizeRoles("admin");
const adminOnly = admin;

module.exports = {
  protect,
  optionalAuth,
  admin,
  authorizeRoles,
  adminOnly,
};
