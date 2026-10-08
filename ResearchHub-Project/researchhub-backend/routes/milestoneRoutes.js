const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createMilestone,
  decideDeadlineExtension,
  deleteMilestone,
  getMilestoneById,
  listRepositoryMilestones,
  requestDeadlineExtension,
  reviewMilestone,
  submitMilestone,
  updateMilestone,
  updateMilestoneProgress,
} = require("../controllers/milestoneController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryMilestones);
router.get("/:milestoneId", authMiddleware, authorize("student", "faculty"), getMilestoneById);
router.post("/", authMiddleware, authorize("faculty"), createMilestone);
router.post("/repository/:repositoryId", authMiddleware, authorize("faculty"), createMilestone);
router.patch("/:milestoneId", authMiddleware, authorize("faculty"), updateMilestone);
router.delete("/:milestoneId", authMiddleware, authorize("faculty"), deleteMilestone);
router.patch("/:milestoneId/progress", authMiddleware, authorize("student"), updateMilestoneProgress);
router.post("/:milestoneId/submit", authMiddleware, authorize("student"), submitMilestone);
router.patch("/:milestoneId/review", authMiddleware, authorize("faculty"), reviewMilestone);
router.post("/:milestoneId/extensions", authMiddleware, authorize("student"), requestDeadlineExtension);
router.patch("/:milestoneId/extensions", authMiddleware, authorize("faculty"), decideDeadlineExtension);

module.exports = router;
