const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  acceptRepositoryInvitation,
  createRepository,
  getRepositoryDocuments,
  getRepositories,
  getRepository,
  generateRepositoryInvitationLink,
  resendRepositoryInvitation,
  saveRepositoryDocument,
} = require("../controllers/repositoryController");

const router = express.Router();

router.post("/", authMiddleware, createRepository);
router.get("/", authMiddleware, getRepositories);
router.get("/:repositoryId/documents", authMiddleware, getRepositoryDocuments);
router.post("/:repositoryId/documents", authMiddleware, saveRepositoryDocument);
router.put(
  "/:repositoryId/documents/:documentId",
  authMiddleware,
  saveRepositoryDocument,
);
router.get("/:repositoryId", authMiddleware, getRepository);
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
