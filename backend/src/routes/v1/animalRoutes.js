const express = require("express");
const router = express.Router();

const { protect, adminOnly, optionalAuth } = require("../../middleware/auth.middleware.js");
const { createImageUpload } = require("../../utils/upload.js");
const { policies } = require("../../middleware/rateLimit.middleware.js");
const {
  getAnimals,
  postAnimal,
  updateAnimal,
  deleteAnimal,
  toggleAnimalActive,
} = require("../../controllers/v1/animalController.js");

const animalImageUpload = createImageUpload({
  folder: "animals",
  maxSizeKB: 4096,
});

router.get("/get-animals", policies.browsing, optionalAuth, getAnimals);
router.post(
  "/post-animals",
  protect,
  adminOnly,
  policies.upload,
  animalImageUpload.single("image"),
  postAnimal
);
router.patch(
  "/update-animals/:id",
  protect,
  adminOnly,
  policies.upload,
  animalImageUpload.single("image"),
  updateAnimal
);
router.delete("/delete-animals/:id", protect, adminOnly, policies.admin, deleteAnimal);
router.patch("/active-on-off-animals/:id", protect, adminOnly, policies.admin, toggleAnimalActive);

module.exports = router;
