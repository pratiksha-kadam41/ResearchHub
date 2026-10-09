const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyEmail,
  resendEmailVerification,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendEmailVerification);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
