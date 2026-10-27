const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const {
  signup,
  login,
  adminLogin,
  verifyEmail,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  requestUpdateOtp,
  updateProfile,
  updatePhone,
  changePassword,
  uploadProfileImage,
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
} = require("../../controllers/v1/authController.js");
const { admin } = require("../../middleware/auth.middleware.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");

const userImageUpload = createImageUpload({ folder: "users", maxSizeKB: 2048 });


router.post("/signup", policies.registration, signup);
router.post("/login", policies.auth, login);
router.post("/admin-login", policies.auth, adminLogin);
router.post("/verify-email", policies.verification, verifyEmail);
router.post("/refresh-token", policies.refresh, refreshToken);
router.post("/forgot-password", policies.recovery, forgotPassword);
router.post("/verify-reset-otp", policies.verification, verifyResetOtp);
router.post("/reset-password", policies.recovery, resetPassword);
router.get("/accounts", protect, admin, policies.admin, getAccounts);
router.get("/accounts/:id", protect, admin, policies.admin, getAccountDetails);
router.post("/request-update-otp", protect, policies.recovery, requestUpdateOtp);
router.patch("/profile", protect, updateProfile);
router.patch("/update-phone", protect, updatePhone);
router.patch("/change-password", protect, changePassword);
router.patch("/profile-image",protect,policies.upload,userImageUpload.single("image"),uploadProfileImage);
router.post("/addresses", protect, addAddress);
router.patch("/addresses/:addressId", protect, updateAddress);
router.patch("/addresses/:addressId/default", protect, setDefaultAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.delete("/account", protect, deleteAccount);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);


module.exports = router;
