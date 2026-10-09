const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { uploadSubmissionFiles } = require("../middleware/submissionUpload");
const {
  downloadSubmissionFile,
  listRepositorySubmissions,
  reviewSubmission,
  startSubmissionReview,
  submitMilestoneWork,
} = require("../controllers/submissionController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositorySubmissions);
router.get("/files/:fileId", authMiddleware, authorize("student", "faculty"), downloadSubmissionFile);
router.post("/milestone/:milestoneId", authMiddleware, authorize("student"), uploadSubmissionFiles, submitMilestoneWork);
router.patch("/:submissionId/start-review", authMiddleware, authorize("faculty"), startSubmissionReview);
router.patch("/:submissionId/review", authMiddleware, authorize("faculty"), reviewSubmission);

module.exports = router;
