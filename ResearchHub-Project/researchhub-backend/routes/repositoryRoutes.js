const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  acceptRepositoryInvitation,
  createRepository,
  getRepositoryDocuments,
  getRepositoryInvitation,
  getMyInvitations,
  getRepositories,
  rejectRepositoryInvitation,
  respondToInvitation,
  getRepository,
  getPublicRepositories,
  generateRepositoryInvitationLink,
  resendRepositoryInvitation,
  removeRepositoryMember,
  saveRepositoryDocument,
  updateRepository,
} = require("../controllers/repositoryController");
const {
  getProjectResults,
  publishProjectResults,
} = require("../controllers/projectResultController");

const router = express.Router();

router.post("/", authMiddleware, createRepository);
router.get("/", authMiddleware, getRepositories);
router.get("/public", authMiddleware, getPublicRepositories);

// In-app: logged-in student fetches their own pending invitations
router.get("/invitations/mine", authMiddleware, getMyInvitations);

// In-app: accept or reject by invitation ID (no raw token needed)
router.post("/invitations/:invitationId/respond/:decision", authMiddleware, respondToInvitation);

router.get("/invitations/:token", getRepositoryInvitation);
router.post(
  "/invitations/:token/accept",
  authMiddleware,
  acceptRepositoryInvitation,
);
router.post("/invitations/:token/reject", authMiddleware, rejectRepositoryInvitation);
router.get("/:repositoryId/documents", authMiddleware, getRepositoryDocuments);
router.post("/:repositoryId/documents", authMiddleware, saveRepositoryDocument);
router.get("/:repositoryId/results", authMiddleware, getProjectResults);
router.post("/:repositoryId/results/publish", authMiddleware, publishProjectResults);
router.put(
  "/:repositoryId/documents/:documentId",
  authMiddleware,
  saveRepositoryDocument,
);
router.get("/:repositoryId", authMiddleware, getRepository);
router.patch("/:repositoryId", authMiddleware, updateRepository);
router.delete("/:repositoryId/members/:memberId", authMiddleware, removeRepositoryMember);
router.post(
  "/:repositoryId/invitations/:invitationId/link",
  authMiddleware,
  generateRepositoryInvitationLink,
);
router.post(
  "/:repositoryId/invitations/:invitationId/resend",
  authMiddleware,
  resendRepositoryInvitation,
);
module.exports = router;
