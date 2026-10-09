const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const text = (value, maxLength) =>
  typeof value === "string" && value.trim() && value.trim().length <= maxLength
    ? value.trim()
    : null;

const parseMarks = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 100 ? number : null;
};

const parseDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const futureDate = (value) => {
  const date = parseDateTime(value);
  return date && date > new Date() ? date : null;
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
    if (req.user.role === "student") {
      delete milestone.earned_marks;
      if (milestone.awarded_marks === null) {
        delete milestone.awarded_marks;
      }
    }
    return res.status(200).json({ milestone });
  } catch (error) {
    console.error("Milestone lookup failed:", error);
    return res.status(500).json({ message: "Unable to load milestone." });
  }
};

const validateMilestoneTotals = async (connection, repositoryId, milestoneMarks, milestoneId = null) => {
  const [[countRow]] = await connection.execute(
    `SELECT COUNT(*) AS milestone_count,
            COALESCE(SUM(marks), 0) AS total_marks
     FROM milestones
     WHERE repository_id = ? ${milestoneId ? "AND id <> ?" : ""}`,
    milestoneId ? [repositoryId, milestoneId] : [repositoryId],
  );

  const totalMarks = Number(countRow.total_marks) + Number(milestoneMarks || 0);
  if (totalMarks > 100) {
    return { valid: false, message: "The total marks allocated to a project cannot exceed 100." };
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
      `SELECT m.*, (m.deadline >= NOW()) AS submission_open,
              COALESCE(
                (SELECT CASE WHEN s.status = 'RESUBMITTED' THEN 'SUBMITTED' ELSE s.status END
                 FROM milestone_submissions s
                 WHERE s.milestone_id = m.id
                 ORDER BY s.version_number DESC, s.id DESC
                 LIMIT 1),
                CASE WHEN m.deadline < NOW() THEN 'OVERDUE' ELSE m.status END
              ) AS effective_status,
              CASE
                WHEN ? = 'faculty' THEN (
                  SELECT sr.marks_awarded
                  FROM milestone_submissions s
                  JOIN submission_reviews sr ON sr.submission_id = s.id
                  WHERE s.milestone_id = m.id
                  ORDER BY s.version_number DESC, sr.reviewed_at DESC, sr.id DESC
                  LIMIT 1
                )
                WHEN (
                  SELECT sr.marks_visible_to_student
                  FROM milestone_submissions s
                  JOIN submission_reviews sr ON sr.submission_id = s.id
                  WHERE s.milestone_id = m.id
                  ORDER BY s.version_number DESC, sr.reviewed_at DESC, sr.id DESC
                  LIMIT 1
                ) = TRUE THEN (
                  SELECT sr.marks_awarded
                  FROM milestone_submissions s
                  JOIN submission_reviews sr ON sr.submission_id = s.id
                  WHERE s.milestone_id = m.id
                  ORDER BY s.version_number DESC, sr.reviewed_at DESC, sr.id DESC
                  LIMIT 1
                )
                ELSE NULL
              END AS awarded_marks,
              COUNT(t.id) AS task_count,
              SUM(t.status = 'COMPLETED') AS completed_task_count
       FROM milestones m
       LEFT JOIN tasks t ON t.milestone_id = m.id
       WHERE m.repository_id = ?
       GROUP BY m.id
       ORDER BY m.order_no ASC, m.id ASC`,
      [req.user.role, repositoryId],
    );

    const [suggestions] = await db.promise().execute(
      `SELECT s.id, s.suggestion_text, s.improvement_text, s.status,
              source.order_no AS source_milestone_number,
              source.title AS source_milestone_title
       FROM milestone_suggestions s
       JOIN milestones source ON source.id = s.milestone_id
       WHERE s.project_id = ? AND s.status <> 'ACCEPTED'
       ORDER BY source.order_no, s.id`,
      [repositoryId],
    );
    const [paperSectionLinks] = await db.promise().execute(
      `SELECT link.milestone_id, section.id AS paper_section_id,
              section.section_title, section.section_order
       FROM milestone_paper_sections link
       JOIN paper_sections section ON section.id = link.paper_section_id
       JOIN research_papers paper ON paper.id = section.paper_id
       WHERE paper.project_id = ?
       ORDER BY link.milestone_id, section.section_order`,
      [repositoryId],
    );
    for (const milestone of milestones) {
      milestone.previous_suggestions = suggestions.filter(
        (suggestion) => Number(suggestion.source_milestone_number) < Number(milestone.order_no),
      );
      milestone.paper_sections = paperSectionLinks
        .filter((link) => Number(link.milestone_id) === Number(milestone.id))
        .map((link) => ({
          id: link.paper_section_id,
          title: link.section_title,
          order: link.section_order,
        }));
      if (req.user.role === "student") {
        delete milestone.earned_marks;
      }
    }

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
  const instructions = typeof req.body.instructions === "string" ? req.body.instructions.trim() || null : null;
  const marks = parseMarks(req.body.marks);
  const deadline = parseDateTime(req.body.deadline);
  const meetingDate = typeof req.body.meetingDate === "string" && req.body.meetingDate
    ? parseDateTime(`${req.body.meetingDate}T00:00:00`)
    : null;
  const requestedOrder = req.body.orderNo === undefined ? null : parsePositiveId(req.body.orderNo);
  if (!repositoryId || !title || !deadline || marks === null ||
      (description && description.length > 10000) ||
      (instructions && instructions.length > 10000) ||
      (req.body.meetingDate && !meetingDate) ||
      (req.body.orderNo !== undefined && !requestedOrder)) {
    return res.status(422).json({ message: "Provide a title, valid marks, deadline, and valid optional details." });
  }

  const connection = await db.promise().getConnection();
  try {
    if (!(await canManageRepositoryMilestones(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can create milestones." });
    }

    await connection.beginTransaction();
    await connection.execute("SELECT id FROM repositories WHERE id = ? FOR UPDATE", [repositoryId]);
    const totalValidation = await validateMilestoneTotals(connection, repositoryId, marks);
    if (!totalValidation.valid) {
      await connection.rollback();
      return res.status(409).json({ message: totalValidation.message });
    }

    const [[orderRow]] = await connection.execute(
      "SELECT COALESCE(MAX(order_no), 0) + 1 AS next_order FROM milestones WHERE repository_id = ?",
      [repositoryId],
    );
    const orderNo = requestedOrder || Number(orderRow.next_order);
    const [result] = await connection.execute(
      `INSERT INTO milestones
       (repository_id, created_by, order_no, title, description, instructions, marks, earned_marks, weight, deadline, meeting_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'NOT_STARTED')`,
      [repositoryId, req.user.id, orderNo, title, description, instructions, marks, marks, deadline, meetingDate],
    );
    if (requestedOrder) {
      await connection.execute(
        `UPDATE milestones
         SET order_no = order_no + 1
         WHERE repository_id = ? AND id <> ? AND order_no >= ?`,
        [repositoryId, result.insertId, orderNo],
      );
    }
    const memberIds = await getRepositoryMemberIds(repositoryId, connection);
    await createNotifications(memberIds, {
      type: "MILESTONE_CREATED",
      title: "New milestone assigned",
      message: `Milestone ${orderNo}: ${title} was added to the project.`,
      linkUrl: `/repository/${repositoryId}?tab=milestones`,
    }, connection);
    await connection.commit();

    return res.status(201).json({ message: "Milestone created.", milestoneId: result.insertId, marks });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone creation failed:", error);
    return res.status(500).json({ message: "Unable to create milestone." });
  } finally {
    connection.release();
  }
};

const createMilestonePlan = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  const inputMilestones = req.body.milestones;
  if (
    !repositoryId ||
    !Array.isArray(inputMilestones) ||
    inputMilestones.length === 0
  ) {
    return res.status(422).json({ message: "Provide a project and at least one milestone." });
  }

  const plan = [];
  for (const [index, item] of inputMilestones.entries()) {
    const title = text(item?.title, 180);
    const description = text(item?.description, 10000);
    const instructions = text(item?.instructions, 10000);
    const marks = parseMarks(item?.marks);
    const deadline = futureDate(item?.deadline);
    const meetingDate = typeof item?.meetingDate === "string" && item.meetingDate
      ? parseDateTime(`${item.meetingDate}T00:00:00`)
      : null;

    if (
      !title ||
      !description ||
      !instructions ||
      marks === null ||
      !deadline ||
      !meetingDate
    ) {
      return res.status(422).json({
        message: `Complete every required field for Milestone ${index + 1}, including its meeting date, description, and student instructions.`,
      });
    }
    plan.push({ title, description, instructions, marks, deadline, meetingDate });
  }

  if (plan.reduce((sum, milestone) => sum + milestone.marks, 0) > 100) {
    return res.status(422).json({ message: "The total marks for a milestone plan cannot exceed 100." });
  }

  const connection = await db.promise().getConnection();
  try {
    if (!(await canManageRepositoryMilestones(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can create milestones." });
    }

    await connection.beginTransaction();
    await connection.execute("SELECT id FROM repositories WHERE id = ? FOR UPDATE", [repositoryId]);
    const [[existingMarks]] = await connection.execute(
      "SELECT COALESCE(SUM(marks), 0) AS total_marks FROM milestones WHERE repository_id = ?",
      [repositoryId],
    );
    const planMarks = plan.reduce((sum, milestone) => sum + milestone.marks, 0);
    if (Number(existingMarks.total_marks) + planMarks > 100) {
      await connection.rollback();
      return res.status(409).json({
        message: "This plan would take the project's total allocated marks above 100.",
      });
    }

    const [[orderRow]] = await connection.execute(
      "SELECT COALESCE(MAX(order_no), 0) AS last_order FROM milestones WHERE repository_id = ?",
      [repositoryId],
    );
    const firstOrder = Number(orderRow.last_order) + 1;
    const createdMilestones = [];
    for (const [index, milestone] of plan.entries()) {
      const orderNo = firstOrder + index;
      const [result] = await connection.execute(
        `INSERT INTO milestones
         (repository_id, created_by, order_no, title, description, instructions,
          marks, earned_marks, weight, deadline, meeting_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'NOT_STARTED')`,
        [
          repositoryId,
          req.user.id,
          orderNo,
          milestone.title,
          milestone.description,
          milestone.instructions,
          milestone.marks,
          milestone.marks,
          milestone.deadline,
          milestone.meetingDate,
        ],
      );
      createdMilestones.push({ id: result.insertId, orderNo, title: milestone.title });
    }

    const memberIds = await getRepositoryMemberIds(repositoryId, connection);
    await createNotifications(memberIds, {
      type: "MILESTONE_PLAN_CREATED",
      title: "Milestone plan published",
      message: `Faculty published ${plan.length} milestones for this project.`,
      linkUrl: `/repository/${repositoryId}?tab=milestones`,
    }, connection);
    await connection.commit();

    return res.status(201).json({
      message: `${plan.length} milestones added to the project plan.`,
      milestones: createdMilestones,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone plan creation failed:", error);
    return res.status(500).json({ message: "Unable to create the milestone plan." });
  } finally {
    connection.release();
  }
};

const deleteMilestonePlan = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });

  const connection = await db.promise().getConnection();
  try {
    if (!(await canManageRepositoryMilestones(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can clear this milestone plan." });
    }

    await connection.beginTransaction();
    await connection.execute("SELECT id FROM repositories WHERE id = ? FOR UPDATE", [repositoryId]);
    const [[history]] = await connection.execute(
      `SELECT COUNT(*) AS submission_count
       FROM milestone_submissions s
       JOIN milestones m ON m.id = s.milestone_id
       WHERE m.repository_id = ?`,
      [repositoryId],
    );
    if (Number(history.submission_count) > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "The plan cannot be cleared because submissions exist. Submission and review history is preserved.",
      });
    }

    const [deleted] = await connection.execute(
      "DELETE FROM milestones WHERE repository_id = ?",
      [repositoryId],
    );
    if (deleted.affectedRows > 0) {
      const memberIds = await getRepositoryMemberIds(repositoryId, connection);
      await createNotifications(memberIds, {
        type: "MILESTONE_PLAN_CLEARED",
        title: "Milestone plan updated",
        message: "The faculty cleared the milestone plan and will publish a new one.",
        linkUrl: `/repository/${repositoryId}?tab=milestones`,
      }, connection);
    }
    await connection.commit();
    return res.status(200).json({
      message: deleted.affectedRows > 0
        ? "Milestone plan cleared. You can now publish a new plan."
        : "This project has no milestones to clear.",
      deletedCount: deleted.affectedRows,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone plan deletion failed:", error);
    return res.status(500).json({ message: "Unable to clear the milestone plan." });
  } finally {
    connection.release();
  }
};

const updateMilestone = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  if (!milestoneId) return res.status(400).json({ message: "Invalid milestone ID." });

  const connection = await db.promise().getConnection();
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
    const instructions = req.body.instructions === undefined
      ? milestone.instructions
      : typeof req.body.instructions === "string" && req.body.instructions.trim().length <= 10000
        ? req.body.instructions.trim() || null
        : undefined;
    const marks = req.body.marks === undefined ? Number(milestone.marks) : parseMarks(req.body.marks);
    const deadline = req.body.deadline === undefined ? new Date(milestone.deadline) : parseDateTime(req.body.deadline);
    const meetingDate = req.body.meetingDate === undefined
      ? milestone.meeting_date
      : req.body.meetingDate
        ? parseDateTime(`${req.body.meetingDate}T00:00:00`)
        : null;
    const requestedOrder = req.body.orderNo === undefined ? Number(milestone.order_no) : parsePositiveId(req.body.orderNo);

    if (!title || description === undefined || instructions === undefined ||
        !Number.isInteger(marks) || marks <= 0 || marks > 100 ||
        !deadline || (req.body.meetingDate && !meetingDate) ||
        !requestedOrder) {
      return res.status(422).json({ message: "One or more milestone fields are invalid." });
    }

    await connection.beginTransaction();
    await connection.execute(
      "SELECT id FROM repositories WHERE id = ? FOR UPDATE",
      [milestone.repository_id],
    );
    const totalValidation = await validateMilestoneTotals(
      connection,
      milestone.repository_id,
      marks,
      milestoneId,
    );
    if (!totalValidation.valid) {
      await connection.rollback();
      return res.status(409).json({ message: totalValidation.message });
    }

    if (requestedOrder < Number(milestone.order_no)) {
      await connection.execute(
        `UPDATE milestones SET order_no = order_no + 1
         WHERE repository_id = ? AND id <> ? AND order_no >= ? AND order_no < ?`,
        [milestone.repository_id, milestoneId, requestedOrder, milestone.order_no],
      );
    } else if (requestedOrder > Number(milestone.order_no)) {
      await connection.execute(
        `UPDATE milestones SET order_no = order_no - 1
         WHERE repository_id = ? AND id <> ? AND order_no > ? AND order_no <= ?`,
        [milestone.repository_id, milestoneId, milestone.order_no, requestedOrder],
      );
    }
    await connection.execute(
      `UPDATE milestones
       SET order_no = ?, title = ?, description = ?, instructions = ?, marks = ?,
           earned_marks = LEAST(COALESCE(earned_marks, 0), ?), weight = ?,
           deadline = ?, meeting_date = ?
       WHERE id = ?`,
      [requestedOrder, title, description, instructions, marks, marks, marks, deadline, meetingDate, milestoneId],
    );
    await connection.commit();
    return res.status(200).json({ message: "Milestone updated." });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone update failed:", error);
    return res.status(500).json({ message: "Unable to update milestone." });
  } finally {
    connection.release();
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
    const [[submissionCount]] = await db.promise().execute(
      "SELECT COUNT(*) AS count FROM milestone_submissions WHERE milestone_id = ?",
      [milestoneId],
    );
    if (Number(submissionCount.count) > 0) {
      return res.status(409).json({
        message: "This milestone has submission history and cannot be deleted.",
      });
    }
    await db.promise().execute("DELETE FROM milestones WHERE id = ?", [milestoneId]);
    return res.status(200).json({ message: "Milestone deleted." });
  } catch (error) {
    console.error("Milestone deletion failed:", error);
    return res.status(500).json({ message: "Unable to delete milestone." });
  }
};

const startMilestone = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  if (!milestoneId) return res.status(400).json({ message: "Invalid milestone ID." });

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await getRepositoryMembership(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "You do not have access to this milestone." });
    }
    const [[deadline]] = await db.promise().execute(
      "SELECT deadline >= NOW() AS submission_open FROM milestones WHERE id = ?",
      [milestoneId],
    );
    if (Number(deadline?.submission_open) !== 1) {
      return res.status(409).json({ message: "This milestone's submission deadline has passed." });
    }
    if (milestone.status === "NOT_STARTED" || milestone.status === "OVERDUE") {
      await db.promise().execute(
        "UPDATE milestones SET status = 'IN_PROGRESS' WHERE id = ?",
        [milestoneId],
      );
    }
    return res.status(200).json({ message: "Milestone marked in progress." });
  } catch (error) {
    console.error("Milestone start failed:", error);
    return res.status(500).json({ message: "Unable to start milestone." });
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
  createMilestonePlan,
  deleteMilestonePlan,
  decideDeadlineExtension,
  deleteMilestone,
  getMilestoneById,
  listRepositoryMilestones,
  requestDeadlineExtension,
  startMilestone,
  updateMilestone,
};
