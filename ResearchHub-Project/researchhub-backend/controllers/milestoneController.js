const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");
const { reviewSubmission, submitMilestoneWork } = require("./submissionController");

const MILESTONE_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "OVERDUE",
  "COMPLETED",
  "LATE",
];

const text = (value, maxLength) =>
  typeof value === "string" && value.trim() && value.trim().length <= maxLength
    ? value.trim()
    : null;

const numericPercentage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
};

const parseMarks = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 20 ? number : null;
};

const futureDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date <= new Date() ? null : date;
};

const normalizeStatus = (value) => {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (status === "DRAFT") return "NOT_STARTED";
  if (status === "DONE") return "COMPLETED";
  return MILESTONE_STATUSES.includes(status) ? status : null;
};

const getMilestone = async (milestoneId) => {
  const [rows] = await db.promise().execute(
    `SELECT m.*, r.name AS repository_name,
            COALESCE(m.marks, m.weight, 0) AS marks,
            COALESCE(m.earned_marks, 0) AS earned_marks
     FROM milestones m
     INNER JOIN repositories r ON r.id = m.repository_id
     WHERE m.id = ?`,
    [milestoneId],
  );
  return rows[0] || null;
};

const canAccessRepository = async (repositoryId, user) => {
  if (!repositoryId || !user) return false;
  if (user.role === "student") {
    return getRepositoryMembership(repositoryId, user.id);
  }
  return getRepositoryMentorship(repositoryId, user.id);
};

const canManageRepositoryMilestones = async (repositoryId, userId) =>
  getRepositoryMentorship(repositoryId, userId);

const getMilestoneById = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  if (!milestoneId) return res.status(400).json({ message: "Invalid milestone ID." });

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await canAccessRepository(milestone.repository_id, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }
    return res.status(200).json({ milestone });
  } catch (error) {
    console.error("Milestone lookup failed:", error);
    return res.status(500).json({ message: "Unable to load milestone." });
  }
};

const validateMilestoneTotals = async (repositoryId, milestoneMarks, milestoneId = null) => {
  const [[countRow]] = await db.promise().execute(
    `SELECT COUNT(*) AS milestone_count,
            COALESCE(SUM(COALESCE(marks, weight, 0)), 0) AS total_marks
     FROM milestones
     WHERE repository_id = ? ${milestoneId ? "AND id <> ?" : ""}`,
    milestoneId ? [repositoryId, milestoneId] : [repositoryId],
  );

  if (Number(countRow.milestone_count) >= 5 && !milestoneId) {
    return { valid: false, message: "Maximum 5 milestones are allowed for a research repository." };
  }

  const totalMarks = Number(countRow.total_marks) + Number(milestoneMarks || 0);
  if (totalMarks > 20) {
    return { valid: false, message: "The total marks for all milestones cannot exceed 20." };
  }

  return { valid: true };
};

const listRepositoryMilestones = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });

  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }

    const [milestones] = await db.promise().execute(
      `SELECT m.*,
              COALESCE(m.marks, m.weight, 0) AS marks,
              COALESCE(m.earned_marks, 0) AS earned_marks,
              CASE
                WHEN m.deadline < UTC_TIMESTAMP() AND m.status NOT IN ('COMPLETED', 'LATE', 'APPROVED') THEN 'OVERDUE'
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
  const marksInput = parseMarks(req.body.marks);
  const legacyWeight = req.body.weight !== undefined ? Number(req.body.weight) : null;
  const weight = numericPercentage(req.body.weight);
  const deadline = futureDate(req.body.deadline);
  const marks = marksInput ?? (legacyWeight !== null && legacyWeight > 0 && legacyWeight <= 20 ? legacyWeight : null);
  const normalizedWeight = weight ?? (marks !== null ? marks : null);
  const effectiveMarks = marks ?? (normalizedWeight !== null ? Math.min(normalizedWeight, 20) : null);

  if (!repositoryId || !title || !deadline || (description && description.length > 10000)) {
    return res.status(422).json({ message: "Provide a title, a valid future deadline, and valid milestone marks." });
  }

  if (effectiveMarks === null) {
    return res.status(422).json({ message: "Milestone marks are required and must be greater than 0 and not exceed 20." });
  }

  if (effectiveMarks > 20) {
    return res.status(422).json({ message: "Marks must be positive and must not exceed 20 individually." });
  }

  try {
    if (!(await canManageRepositoryMilestones(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can create milestones." });
    }

    const totalValidation = await validateMilestoneTotals(repositoryId, effectiveMarks, null);
    if (!totalValidation.valid) {
      return res.status(409).json({ message: totalValidation.message });
    }

    const [result] = await db.promise().execute(
      `INSERT INTO milestones (repository_id, created_by, title, description, marks, earned_marks, weight, deadline, status)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'NOT_STARTED')`,
      [repositoryId, req.user.id, title, description, effectiveMarks, normalizedWeight ?? effectiveMarks, deadline],
    );

    const memberIds = await getRepositoryMemberIds(repositoryId);
    await createNotifications(memberIds, {
      type: "MILESTONE_CREATED",
      title: "New milestone assigned",
      message: `New milestone assigned: ${title}. Deadline: ${new Date(deadline).toLocaleDateString()}. Marks: ${effectiveMarks}.`,
      linkUrl: `/repository/${repositoryId}`,
    });

    return res.status(201).json({ message: "Milestone created.", milestoneId: result.insertId, marks: effectiveMarks });
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
    const requestedMarks = req.body.marks !== undefined ? parseMarks(req.body.marks) : Number(milestone.marks || milestone.weight || 0);
    const requestedWeight = req.body.weight !== undefined ? numericPercentage(req.body.weight) : Number(milestone.weight || milestone.marks || 0);
    const marks = requestedMarks ?? (requestedWeight !== null ? Math.min(requestedWeight, 20) : null);
    const weight = req.body.weight !== undefined ? requestedWeight : Number(milestone.weight || milestone.marks || 0);
    const deadline = req.body.deadline === undefined ? new Date(milestone.deadline) : futureDate(req.body.deadline);
    const status = req.body.status === undefined ? (milestone.status || "NOT_STARTED") : normalizeStatus(req.body.status);

    if (!title || description === undefined || !marks || !deadline || !status) {
      return res.status(422).json({ message: "One or more milestone fields are invalid." });
    }

    const totalValidation = await validateMilestoneTotals(milestone.repository_id, marks, milestoneId);
    if (!totalValidation.valid) {
      return res.status(409).json({ message: totalValidation.message });
    }

    await db.promise().execute(
      `UPDATE milestones
       SET title = ?, description = ?, marks = ?, earned_marks = LEAST(COALESCE(earned_marks, 0), ?), weight = ?, deadline = ?, status = ?
       WHERE id = ?`,
      [title, description, marks, marks, weight, deadline, status, milestoneId],
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
    const status = completion === 100 ? "COMPLETED" : completion > 0 ? "IN_PROGRESS" : "NOT_STARTED";
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

const submitMilestone = async (req, res) => {
  return submitMilestoneWork(req, res);
};

const reviewMilestone = async (req, res) => {
  return reviewSubmission(req, res);
};

module.exports = {
  createMilestone,
  decideDeadlineExtension,
  deleteMilestone,
  getMilestoneById,
  listRepositoryMilestones,
  requestDeadlineExtension,
  reviewMilestone,
  submitMilestone,
  updateMilestone,
  updateMilestoneProgress,
};
