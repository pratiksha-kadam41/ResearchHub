const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createMentorRequest,
  getMentorRequests,
  updateMentorRequest,
} = require("../controllers/mentorRequestController");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get("/", authMiddleware, authorize("student", "faculty"), getMentorRequests);
router.post("/", authMiddleware, authorize("student"), createMentorRequest);
router.patch("/:requestId", authMiddleware, authorize("student", "faculty"), updateMentorRequest);

module.exports = router;
