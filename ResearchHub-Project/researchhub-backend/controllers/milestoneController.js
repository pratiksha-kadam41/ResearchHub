const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "LATE", "OVERDUE"];
const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const text = (value, maxLength) =>
  typeof value === "string" && value.trim() && value.trim().length <= maxLength
    ? value.trim()
    : null;

const numericPercentage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
};

const futureDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date <= new Date() ? null : date;
};

const getMilestone = async (milestoneId) => {
  const [rows] = await db.promise().execute(
    `SELECT m.*, r.name AS repository_name
     FROM milestones m
     INNER JOIN repositories r ON r.id = m.repository_id
     WHERE m.id = ?`,
    [milestoneId],
  );
  return rows[0] || null;
};

const canAccessRepository = async (repositoryId, user) => {
  if (user.role === "student") {
    return getRepositoryMembership(repositoryId, user.id);
  }
  return getRepositoryMentorship(repositoryId, user.id);
};

const canManageRepositoryMilestones = async (repositoryId, userId) =>
  getRepositoryMentorship(repositoryId, userId);

const listRepositoryMilestones = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });

  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }

    const [milestones] = await db.promise().execute(
      `SELECT m.*,
              CASE
                WHEN m.deadline < UTC_TIMESTAMP() AND m.status NOT IN ('COMPLETED', 'LATE') THEN 'OVERDUE'
                ELSE m.status
              END AS effective_status,
              COUNT(t.id) AS task_count,
              SUM(t.status = 'COMPLETED') AS completed_task_count
       FROM milestones m
       LEFT JOIN tasks t ON t.milestone_id = m.id
       WHERE m.repository_id = ?
       GROUP BY m.id
       ORDER BY m.deadline ASC, m.id ASC`,
      [repositoryId],
    );

    return res.status(200).json({ milestones });
  } catch (error) {
    console.error("Milestone list failed:", error);
    return res.status(500).json({ message: "Unable to load milestones." });
  }
};

const createMilestone = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  const title = text(req.body.title, 180);
  const description = typeof req.body.description === "string" ? req.body.description.trim() || null : null;
  const weight = numericPercentage(req.body.weight);
  const deadline = futureDate(req.body.deadline);

  if (!repositoryId || !title || weight === null || weight === 0 || !deadline || (description && description.length > 10000)) {
    return res.status(422).json({ message: "Provide a title, a weight from 0.01 to 100, and a future deadline." });
  }

  try {
    if (!(await canManageRepositoryMilestones(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can create milestones." });
    }

    const [[total]] = await db.promise().execute(
      "SELECT COALESCE(SUM(weight), 0) AS total_weight FROM milestones WHERE repository_id = ?",
      [repositoryId],
    );
    if (Number(total.total_weight) + weight > 100) {
      return res.status(409).json({ message: "Milestone weights cannot exceed 100% for a project." });
    }

    const [result] = await db.promise().execute(
      `INSERT INTO milestones (repository_id, created_by, title, description, weight, deadline)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [repositoryId, req.user.id, title, description, weight, deadline],
    );
    const memberIds = await getRepositoryMemberIds(repositoryId);
    await createNotifications(memberIds, {
      type: "MILESTONE_CREATED",
      title: "New milestone",
      message: `${title} has been added to your project plan.`,
      linkUrl: `/repository/${repositoryId}`,
    });

    return res.status(201).json({ message: "Milestone created.", milestoneId: result.insertId });
  } catch (error) {
    console.error("Milestone creation failed:", error);
    return res.status(500).json({ message: "Unable to create milestone." });
  }
};

const updateMilestone = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  if (!milestoneId) return res.status(400).json({ message: "Invalid milestone ID." });

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await canManageRepositoryMilestones(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can update milestones." });
    }

    const title = req.body.title === undefined ? milestone.title : text(req.body.title, 180);
    const description = req.body.description === undefined
      ? milestone.description
      : typeof req.body.description === "string" && req.body.description.trim().length <= 10000
        ? req.body.description.trim() || null
        : undefined;
    const weight = req.body.weight === undefined ? Number(milestone.weight) : numericPercentage(req.body.weight);
    const deadline = req.body.deadline === undefined ? new Date(milestone.deadline) : futureDate(req.body.deadline);
    const status = req.body.status === undefined ? milestone.status : String(req.body.status).toUpperCase();

    if (!title || description === undefined || weight === null || weight === 0 || !deadline || !MILESTONE_STATUSES.includes(status)) {
      return res.status(422).json({ message: "One or more milestone fields are invalid." });
    }
    const [[total]] = await db.promise().execute(
      "SELECT COALESCE(SUM(weight), 0) AS total_weight FROM milestones WHERE repository_id = ? AND id <> ?",
      [milestone.repository_id, milestoneId],
    );
    if (Number(total.total_weight) + weight > 100) {
      return res.status(409).json({ message: "Milestone weights cannot exceed 100% for a project." });
    }

    await db.promise().execute(
      `UPDATE milestones
       SET title = ?, description = ?, weight = ?, deadline = ?, status = ?
       WHERE id = ?`,
      [title, description, weight, deadline, status, milestoneId],
    );
    return res.status(200).json({ message: "Milestone updated." });
  } catch (error) {
    console.error("Milestone update failed:", error);
    return res.status(500).json({ message: "Unable to update milestone." });
  }
};

const deleteMilestone = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  if (!milestoneId) return res.status(400).json({ message: "Invalid milestone ID." });

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await canManageRepositoryMilestones(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can delete milestones." });
    }
    await db.promise().execute("DELETE FROM milestones WHERE id = ?", [milestoneId]);
    return res.status(200).json({ message: "Milestone deleted." });
  } catch (error) {
    console.error("Milestone deletion failed:", error);
    return res.status(500).json({ message: "Unable to delete milestone." });
  }
};

const updateMilestoneProgress = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const completion = numericPercentage(req.body.completionPercentage);
  if (!milestoneId || completion === null) {
    return res.status(422).json({ message: "Completion percentage must be between 0 and 100." });
  }

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await getRepositoryMembership(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "You do not have access to this milestone." });
    }
    const status = completion === 100 ? "COMPLETED" : completion > 0 ? "IN_PROGRESS" : "PENDING";
    await db.promise().execute(
      "UPDATE milestones SET completion_percentage = ?, status = ? WHERE id = ?",
      [completion, status, milestoneId],
    );
    return res.status(200).json({ message: "Milestone progress updated." });
  } catch (error) {
    console.error("Milestone progress update failed:", error);
    return res.status(500).json({ message: "Unable to update milestone progress." });
  }
};

const requestDeadlineExtension = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const requestedDeadline = futureDate(req.body.requestedDeadline);
  const reason = text(req.body.reason, 2000);
  if (!milestoneId || !requestedDeadline || !reason) {
    return res.status(422).json({ message: "Provide a future requested deadline and a reason." });
  }

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await getRepositoryMembership(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "You do not have access to this milestone." });
    }
    if (milestone.extension_status === "PENDING") {
      return res.status(409).json({ message: "A deadline extension request is already pending." });
    }
    await db.promise().execute(
      `UPDATE milestones
       SET extension_requested_deadline = ?, extension_reason = ?, extension_status = 'PENDING'
       WHERE id = ?`,
      [requestedDeadline, reason, milestoneId],
    );
    const [[mentor]] = await db.promise().execute(
      "SELECT faculty_id FROM mentor_requests WHERE repository_id = ? AND status = 'ACCEPTED'",
      [milestone.repository_id],
    );
    if (mentor) {
      await createNotifications([mentor.faculty_id], {
        type: "EXTENSION_REQUESTED",
        title: "Deadline extension requested",
        message: `${milestone.title} has a new deadline-extension request.`,
        linkUrl: "/dashboard/faculty",
      });
    }
    return res.status(200).json({ message: "Deadline extension requested." });
  } catch (error) {
    console.error("Extension request failed:", error);
    return res.status(500).json({ message: "Unable to request a deadline extension." });
  }
};

const decideDeadlineExtension = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const decision = typeof req.body.decision === "string" ? req.body.decision.toUpperCase() : "";
  if (!milestoneId || !["APPROVED", "REJECTED"].includes(decision)) {
    return res.status(422).json({ message: "Decision must be APPROVED or REJECTED." });
  }

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await canManageRepositoryMilestones(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can decide extension requests." });
    }
    if (milestone.extension_status !== "PENDING") {
      return res.status(409).json({ message: "There is no pending deadline extension request." });
    }
    if (decision === "APPROVED") {
      await db.promise().execute(
        `UPDATE milestones
         SET deadline = extension_requested_deadline, extension_status = 'APPROVED'
         WHERE id = ?`,
        [milestoneId],
      );
    } else {
      await db.promise().execute(
        "UPDATE milestones SET extension_status = 'REJECTED' WHERE id = ?",
        [milestoneId],
      );
    }
    const memberIds = await getRepositoryMemberIds(milestone.repository_id);
    await createNotifications(memberIds, {
      type: "EXTENSION_DECIDED",
      title: "Deadline extension updated",
      message: `${milestone.title}: your extension request was ${decision.toLowerCase()}.`,
      linkUrl: `/repository/${milestone.repository_id}`,
    });
    return res.status(200).json({ message: `Deadline extension ${decision.toLowerCase()}.` });
  } catch (error) {
    console.error("Extension decision failed:", error);
    return res.status(500).json({ message: "Unable to decide deadline extension." });
  }
};

module.exports = {
  createMilestone,
  decideDeadlineExtension,
  deleteMilestone,
  listRepositoryMilestones,
  requestDeadlineExtension,
  updateMilestone,
  updateMilestoneProgress,
};
