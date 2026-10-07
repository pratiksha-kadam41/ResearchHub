const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createMilestone,
  decideDeadlineExtension,
  deleteMilestone,
  listRepositoryMilestones,
  requestDeadlineExtension,
  updateMilestone,
  updateMilestoneProgress,
} = require("../controllers/milestoneController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryMilestones);
router.post("/repository/:repositoryId", authMiddleware, authorize("faculty"), createMilestone);
router.patch("/:milestoneId", authMiddleware, authorize("faculty"), updateMilestone);
router.delete("/:milestoneId", authMiddleware, authorize("faculty"), deleteMilestone);
router.patch("/:milestoneId/progress", authMiddleware, authorize("student"), updateMilestoneProgress);
router.post("/:milestoneId/extensions", authMiddleware, authorize("student"), requestDeadlineExtension);
router.patch("/:milestoneId/extensions", authMiddleware, authorize("faculty"), decideDeadlineExtension);

module.exports = router;
