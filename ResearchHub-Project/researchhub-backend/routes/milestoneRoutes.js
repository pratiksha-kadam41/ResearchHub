const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createMilestone,
  createMilestonePlan,
  deleteMilestonePlan,
  decideDeadlineExtension,
  deleteMilestone,
  getMilestoneById,
  listRepositoryMilestones,
  requestDeadlineExtension,
  startMilestone,
  updateMilestone,
} = require("../controllers/milestoneController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryMilestones);
router.get("/:milestoneId", authMiddleware, authorize("student", "faculty"), getMilestoneById);
router.post("/", authMiddleware, authorize("faculty"), createMilestone);
router.post("/repository/:repositoryId/plan", authMiddleware, authorize("faculty"), createMilestonePlan);
router.delete("/repository/:repositoryId/plan", authMiddleware, authorize("faculty"), deleteMilestonePlan);
router.post("/repository/:repositoryId", authMiddleware, authorize("faculty"), createMilestone);
router.patch("/:milestoneId", authMiddleware, authorize("faculty"), updateMilestone);
router.delete("/:milestoneId", authMiddleware, authorize("faculty"), deleteMilestone);
router.patch("/:milestoneId/start", authMiddleware, authorize("student"), startMilestone);
router.post("/:milestoneId/extensions", authMiddleware, authorize("student"), requestDeadlineExtension);
router.patch("/:milestoneId/extensions", authMiddleware, authorize("faculty"), decideDeadlineExtension);

module.exports = router;
