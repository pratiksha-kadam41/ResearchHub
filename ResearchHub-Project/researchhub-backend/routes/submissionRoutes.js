const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createEvaluation,
  listRepositoryEvaluations,
  listRepositorySubmissions,
  reviewSubmission,
  submitMilestoneWork,
} = require("../controllers/submissionController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositorySubmissions);
router.post("/milestone/:milestoneId", authMiddleware, authorize("student"), submitMilestoneWork);
router.patch("/:submissionId/review", authMiddleware, authorize("faculty"), reviewSubmission);
router.post("/evaluations", authMiddleware, authorize("faculty"), createEvaluation);
router.get("/evaluations/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryEvaluations);

module.exports = router;
