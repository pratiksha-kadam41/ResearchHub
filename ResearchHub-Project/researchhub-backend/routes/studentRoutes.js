const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getStudentProfile,
  getStudentDetailedProfile,
  createStudentProfile,
  updateStudentProfile,
} = require("../controllers/studentController");

// Get basic logged-in student information
router.get("/me", authMiddleware, getStudentProfile);

// Get detailed student profile
router.get("/profile", authMiddleware, getStudentDetailedProfile);

// Create student profile
router.post("/profile", authMiddleware, createStudentProfile);

// Update student profile
router.put("/profile", authMiddleware, updateStudentProfile);

module.exports = router;
