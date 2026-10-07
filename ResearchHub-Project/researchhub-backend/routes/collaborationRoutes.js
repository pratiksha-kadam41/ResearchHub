const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { createComment, deleteComment, listComments, updateComment } = require("../controllers/collaborationController");

const router = express.Router();

router.get("/repository/:repositoryId/comments", authMiddleware, authorize("student", "faculty"), listComments);
router.post("/repository/:repositoryId/comments", authMiddleware, authorize("student", "faculty"), createComment);
router.patch("/comments/:commentId", authMiddleware, authorize("student", "faculty"), updateComment);
router.delete("/comments/:commentId", authMiddleware, authorize("student", "faculty"), deleteComment);

module.exports = router;
