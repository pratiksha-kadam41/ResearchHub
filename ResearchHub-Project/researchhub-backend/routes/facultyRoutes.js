const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  getFacultyDashboard,
  getOwnFacultyProfile,
  listFaculty,
  updateFacultyProfile,
} = require("../controllers/facultyController");

const router = express.Router();

router.get("/", authMiddleware, authorize("student"), listFaculty);
router.get("/profile", authMiddleware, authorize("faculty"), getOwnFacultyProfile);
router.put("/profile", authMiddleware, authorize("faculty"), updateFacultyProfile);
router.get("/dashboard", authMiddleware, authorize("faculty"), getFacultyDashboard);

module.exports = router;
