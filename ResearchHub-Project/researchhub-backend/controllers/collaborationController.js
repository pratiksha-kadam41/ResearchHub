const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const COMMENT_TYPES = ["DISCUSSION", "QUESTION", "FEEDBACK", "REVISION"];

const canAccessRepository = (repositoryId, user) =>
  user.role === "student"
    ? getRepositoryMembership(repositoryId, user.id)
    : getRepositoryMentorship(repositoryId, user.id);

const listComments = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });
  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }
    const [comments] = await db.promise().execute(
      `SELECT c.id, c.milestone_id, c.body, c.comment_type, c.created_at, c.updated_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
       FROM comments c
       INNER JOIN users u ON u.id = c.author_id
       WHERE c.repository_id = ?
       ORDER BY c.created_at ASC, c.id ASC`,
      [repositoryId],
    );
    return res.status(200).json({ comments });
  } catch (error) {
    console.error("Comment list failed:", error);
    return res.status(500).json({ message: "Unable to load project discussion." });
  }
};

const createComment = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  const milestoneId = req.body.milestoneId === null || req.body.milestoneId === undefined
    ? null
    : parsePositiveId(req.body.milestoneId);
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  const type = typeof req.body.type === "string" ? req.body.type.toUpperCase() : "DISCUSSION";
  if (!repositoryId || !body || body.length > 10000 || !COMMENT_TYPES.includes(type) || (req.body.milestoneId !== null && req.body.milestoneId !== undefined && !milestoneId)) {
    return res.status(422).json({ message: "Please provide a valid comment." });
  }
  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(403).json({ message: "You do not have access to this project." });
    }
    if (milestoneId) {
      const [[milestone]] = await db.promise().execute(
        "SELECT id FROM milestones WHERE id = ? AND repository_id = ?",
        [milestoneId, repositoryId],
      );
      if (!milestone) return res.status(422).json({ message: "Milestone does not belong to this project." });
    }
    const [result] = await db.promise().execute(
      "INSERT INTO comments (repository_id, milestone_id, author_id, body, comment_type) VALUES (?, ?, ?, ?, ?)",
      [repositoryId, milestoneId, req.user.id, body, type],
    );
    const memberIds = await getRepositoryMemberIds(repositoryId);
    const [[mentor]] = await db.promise().execute(
      "SELECT faculty_id FROM mentor_requests WHERE repository_id = ? AND status = 'ACCEPTED'",
      [repositoryId],
    );
    const recipients = mentor ? [...memberIds, mentor.faculty_id] : memberIds;
    await createNotifications(recipients.filter((id) => id !== req.user.id), {
      type: "PROJECT_COMMENT",
      title: type === "REVISION" ? "Revision requested" : "New project comment",
      message: `A new ${type.toLowerCase()} was posted in the project discussion.`,
      linkUrl: `/repository/${repositoryId}`,
    });
    return res.status(201).json({ message: "Comment added.", commentId: result.insertId });
  } catch (error) {
    console.error("Comment creation failed:", error);
    return res.status(500).json({ message: "Unable to add comment." });
  }
};

const updateComment = async (req, res) => {
  const commentId = parsePositiveId(req.params.commentId);
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (!commentId || !body || body.length > 10000) return res.status(422).json({ message: "Please provide a valid comment." });
  try {
    const [rows] = await db.promise().execute("SELECT author_id FROM comments WHERE id = ?", [commentId]);
    if (!rows[0]) return res.status(404).json({ message: "Comment not found." });
    if (rows[0].author_id !== req.user.id) return res.status(403).json({ message: "Only the author can edit this comment." });
    await db.promise().execute("UPDATE comments SET body = ? WHERE id = ?", [body, commentId]);
    return res.status(200).json({ message: "Comment updated." });
  } catch (error) {
    console.error("Comment update failed:", error);
    return res.status(500).json({ message: "Unable to update comment." });
  }
};

const deleteComment = async (req, res) => {
  const commentId = parsePositiveId(req.params.commentId);
  if (!commentId) return res.status(400).json({ message: "Invalid comment ID." });
  try {
    const [rows] = await db.promise().execute("SELECT author_id, repository_id FROM comments WHERE id = ?", [commentId]);
    const comment = rows[0];
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    const canModerate = req.user.role === "faculty" && await getRepositoryMentorship(comment.repository_id, req.user.id);
    if (comment.author_id !== req.user.id && !canModerate) return res.status(403).json({ message: "You cannot delete this comment." });
    await db.promise().execute("DELETE FROM comments WHERE id = ?", [commentId]);
    return res.status(200).json({ message: "Comment deleted." });
  } catch (error) {
    console.error("Comment deletion failed:", error);
    return res.status(500).json({ message: "Unable to delete comment." });
  }
};

module.exports = { createComment, deleteComment, listComments, updateComment };
