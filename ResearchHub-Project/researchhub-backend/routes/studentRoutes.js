const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const {
  getStudentProfile,
  getStudentDetailedProfile,
  createStudentProfile,
  updateStudentProfile,
} = require("../controllers/studentController");

// Get basic logged-in student information
router.get("/me", authMiddleware, authorize("student"), getStudentProfile);

// Get detailed student profile
router.get("/profile", authMiddleware, authorize("student"), getStudentDetailedProfile);

// Create student profile
router.post("/profile", authMiddleware, authorize("student"), createStudentProfile);

// Update student profile
router.put("/profile", authMiddleware, authorize("student"), updateStudentProfile);

module.exports = router;
