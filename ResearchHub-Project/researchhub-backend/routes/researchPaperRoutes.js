const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createPaperFromTemplate,
  getPaperSectionHistory,
  getPaperWorkspace,
  listPaperSubmissions,
  reviewPaperSubmission,
  savePaperSection,
  submitPaperForReview,
  updateMilestonePaperSections,
  updatePaperStatus,
} = require("../controllers/researchPaperController");

const router = express.Router();

router.get("/project/:projectId", authMiddleware, authorize("student", "faculty"), getPaperWorkspace);
router.get("/project/:projectId/submissions", authMiddleware, authorize("student", "faculty"), listPaperSubmissions);
router.post("/project/:projectId", authMiddleware, authorize("student"), createPaperFromTemplate);
router.post("/project/:projectId/submissions", authMiddleware, authorize("student"), submitPaperForReview);
router.patch("/submissions/:submissionId/review", authMiddleware, authorize("faculty"), reviewPaperSubmission);
router.put("/project/:projectId/milestone-sections", authMiddleware, authorize("faculty"), updateMilestonePaperSections);
router.put("/:paperId/sections/:sectionId", authMiddleware, authorize("student", "faculty"), savePaperSection);
router.get("/:paperId/sections/:sectionId/history", authMiddleware, authorize("student", "faculty"), getPaperSectionHistory);
router.patch("/:paperId/status", authMiddleware, authorize("student", "faculty"), updatePaperStatus);

module.exports = router;
