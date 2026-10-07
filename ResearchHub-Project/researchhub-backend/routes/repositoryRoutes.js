const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  acceptRepositoryInvitation,
  createRepository,
  getRepositoryDocuments,
  getRepositories,
  getRepository,
  getPublicRepositories,
  generateRepositoryInvitationLink,
  resendRepositoryInvitation,
  removeRepositoryMember,
  saveRepositoryDocument,
  updateRepository,
} = require("../controllers/repositoryController");

const router = express.Router();

router.post("/", authMiddleware, createRepository);
router.get("/", authMiddleware, getRepositories);
router.get("/public", authMiddleware, getPublicRepositories);
router.get("/:repositoryId/documents", authMiddleware, getRepositoryDocuments);
router.post("/:repositoryId/documents", authMiddleware, saveRepositoryDocument);
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
router.post(
  "/invitations/:token/accept",
  authMiddleware,
  acceptRepositoryInvitation,
);

module.exports = router;
