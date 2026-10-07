const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const REVIEW_DECISIONS = ["APPROVED", "REVISION_REQUIRED", "REJECTED"];

const validUrl = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

const getSubmission = async (submissionId) => {
  const [rows] = await db.promise().execute(
    `SELECT s.*, m.repository_id, m.title AS milestone_title
     FROM milestone_submissions s
     INNER JOIN milestones m ON m.id = s.milestone_id
     WHERE s.id = ?`,
    [submissionId],
  );
  return rows[0] || null;
};

const submitMilestoneWork = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const workUrl = validUrl(req.body.workUrl);
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
  if (!milestoneId || workUrl === undefined || notes.length > 10000 || (!workUrl && !notes)) {
    return res.status(422).json({ message: "Provide a valid work link or submission notes." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [milestones] = await connection.execute(
      "SELECT id, repository_id, title, deadline, submission_status FROM milestones WHERE id = ? FOR UPDATE",
      [milestoneId],
    );
    const milestone = milestones[0];
    if (!milestone) {
      await connection.rollback();
      return res.status(404).json({ message: "Milestone not found." });
    }
    if (!(await getRepositoryMembership(milestone.repository_id, req.user.id, connection))) {
      await connection.rollback();
      return res.status(403).json({ message: "You do not have access to this milestone." });
    }
    if (["APPROVED", "REJECTED"].includes(milestone.submission_status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This milestone has already received a final review." });
    }
    const [[versions]] = await connection.execute(
      "SELECT COALESCE(MAX(version_number), 0) AS latest_version FROM milestone_submissions WHERE milestone_id = ? FOR UPDATE",
      [milestoneId],
    );
    const versionNumber = Number(versions.latest_version) + 1;
    const submissionStatus = milestone.submission_status === "REVISION_REQUIRED" ? "RESUBMITTED" : "SUBMITTED";
    const [result] = await connection.execute(
      `INSERT INTO milestone_submissions
       (milestone_id, submitted_by, work_url, notes, version_number, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [milestoneId, req.user.id, workUrl, notes || null, versionNumber, submissionStatus],
    );
    const isLate = new Date(milestone.deadline) < new Date();
    await connection.execute(
      "UPDATE milestones SET submission_status = ?, status = ? WHERE id = ?",
      [submissionStatus, isLate ? "LATE" : "IN_PROGRESS", milestoneId],
    );
    const [mentorRows] = await connection.execute(
      "SELECT faculty_id FROM mentor_requests WHERE repository_id = ? AND status = 'ACCEPTED'",
      [milestone.repository_id],
    );
    await createNotifications(mentorRows.map((row) => row.faculty_id), {
      type: "MILESTONE_SUBMITTED",
      title: "Milestone submitted",
      message: `${milestone.title} has a new submission to review.`,
      linkUrl: "/dashboard/faculty",
    }, connection);
    await connection.commit();

    return res.status(201).json({
      message: isLate ? "Milestone submitted after the deadline." : "Milestone submitted for review.",
      submissionId: result.insertId,
      versionNumber,
      isLate,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone submission failed:", error);
    return res.status(500).json({ message: "Unable to submit milestone work." });
  } finally {
    connection.release();
  }
};

const reviewSubmission = async (req, res) => {
  const submissionId = parsePositiveId(req.params.submissionId);
  const decision = typeof req.body.decision === "string" ? req.body.decision.toUpperCase() : "";
  const feedback = typeof req.body.feedback === "string" ? req.body.feedback.trim() : "";
  if (!submissionId || !REVIEW_DECISIONS.includes(decision) || feedback.length > 10000) {
    return res.status(422).json({ message: "Provide a valid review decision and feedback." });
  }

  try {
    const submission = await getSubmission(submissionId);
    if (!submission) return res.status(404).json({ message: "Submission not found." });
    if (!(await getRepositoryMentorship(submission.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can review submissions." });
    }
    if (["APPROVED", "REJECTED"].includes(submission.status)) {
      return res.status(409).json({ message: "This submission has already received a final review." });
    }
    await db.promise().execute(
      "INSERT INTO submission_reviews (submission_id, reviewed_by, decision, feedback) VALUES (?, ?, ?, ?)",
      [submissionId, req.user.id, decision, feedback || null],
    );
    await db.promise().execute(
      "UPDATE milestone_submissions SET status = ? WHERE id = ?",
      [decision, submissionId],
    );
    await db.promise().execute(
      "UPDATE milestones SET submission_status = ?, status = ? WHERE id = ?",
      [decision, decision === "APPROVED" ? "COMPLETED" : "IN_PROGRESS", submission.milestone_id],
    );
    await createNotifications([submission.submitted_by], {
      type: "SUBMISSION_REVIEWED",
      title: "Submission reviewed",
      message: `${submission.milestone_title}: ${decision.toLowerCase().replace("_", " ")}.`,
      linkUrl: `/repository/${submission.repository_id}`,
    });
    return res.status(200).json({ message: "Submission review recorded." });
  } catch (error) {
    console.error("Submission review failed:", error);
    return res.status(500).json({ message: "Unable to review submission." });
  }
};

const listRepositorySubmissions = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });
  try {
    const access = req.user.role === "student"
      ? await getRepositoryMembership(repositoryId, req.user.id)
      : await getRepositoryMentorship(repositoryId, req.user.id);
    if (!access) return res.status(404).json({ message: "Project not found or you do not have access." });
    const [submissions] = await db.promise().execute(
      `SELECT s.id, s.work_url, s.notes, s.version_number, s.status, s.submitted_at,
              m.id AS milestone_id, m.title AS milestone_title, u.name AS submitted_by_name,
              review.decision AS latest_decision, review.feedback AS latest_feedback, review.reviewed_at
       FROM milestone_submissions s
       INNER JOIN milestones m ON m.id = s.milestone_id
       INNER JOIN users u ON u.id = s.submitted_by
       LEFT JOIN submission_reviews review ON review.id = (
         SELECT sr.id FROM submission_reviews sr
         WHERE sr.submission_id = s.id ORDER BY sr.reviewed_at DESC, sr.id DESC LIMIT 1
       )
       WHERE m.repository_id = ?
       ORDER BY s.submitted_at DESC, s.id DESC`,
      [repositoryId],
    );
    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Submission list failed:", error);
    return res.status(500).json({ message: "Unable to load submissions." });
  }
};

const createEvaluation = async (req, res) => {
  const repositoryId = parsePositiveId(req.body.repositoryId);
  const milestoneId = req.body.milestoneId === null || req.body.milestoneId === undefined ? null : parsePositiveId(req.body.milestoneId);
  const submissionId = req.body.submissionId === null || req.body.submissionId === undefined ? null : parsePositiveId(req.body.submissionId);
  const studentId = parsePositiveId(req.body.studentId);
  const originalMarks = Number(req.body.originalMarks);
  const deductedMarks = req.body.deductedMarks === undefined ? 0 : Number(req.body.deductedMarks);
  const reason = typeof req.body.deductionReason === "string" ? req.body.deductionReason.trim() : "";
  if (!repositoryId || !studentId || !Number.isFinite(originalMarks) || !Number.isFinite(deductedMarks) || originalMarks < 0 || deductedMarks < 0 || originalMarks > 1000 || deductedMarks > 1000 || reason.length > 2000 || (req.body.milestoneId !== null && req.body.milestoneId !== undefined && !milestoneId) || (req.body.submissionId !== null && req.body.submissionId !== undefined && !submissionId)) {
    return res.status(422).json({ message: "Please provide valid evaluation values." });
  }

  try {
    if (!(await getRepositoryMentorship(repositoryId, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can evaluate work." });
    }
    const [[studentMembership]] = await db.promise().execute(
      "SELECT user_id FROM repository_members WHERE repository_id = ? AND user_id = ?",
      [repositoryId, studentId],
    );
    if (!studentMembership) return res.status(422).json({ message: "Evaluation target must be a project member." });
    if (milestoneId) {
      const [[milestone]] = await db.promise().execute(
        "SELECT id FROM milestones WHERE id = ? AND repository_id = ?",
        [milestoneId, repositoryId],
      );
      if (!milestone) return res.status(422).json({ message: "Milestone does not belong to this project." });
    }
    if (submissionId) {
      const [[submission]] = await db.promise().execute(
        `SELECT s.id FROM milestone_submissions s
         INNER JOIN milestones m ON m.id = s.milestone_id
         WHERE s.id = ? AND m.repository_id = ? AND s.submitted_by = ?`,
        [submissionId, repositoryId, studentId],
      );
      if (!submission) return res.status(422).json({ message: "Submission does not belong to this student and project." });
    }
    const finalMarks = Math.max(0, originalMarks - deductedMarks);
    const [result] = await db.promise().execute(
      `INSERT INTO evaluations
       (repository_id, milestone_id, submission_id, student_id, evaluator_id,
        original_marks, deducted_marks, final_marks, deduction_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [repositoryId, milestoneId, submissionId, studentId, req.user.id, originalMarks, deductedMarks, finalMarks, reason || null],
    );
    await createNotifications([studentId], {
      type: "MARKS_ASSIGNED",
      title: "Evaluation recorded",
      message: `New marks were assigned: ${finalMarks} after deductions.`,
      linkUrl: `/repository/${repositoryId}`,
    });
    return res.status(201).json({ message: "Evaluation recorded.", evaluationId: result.insertId, finalMarks });
  } catch (error) {
    console.error("Evaluation creation failed:", error);
    return res.status(500).json({ message: "Unable to record evaluation." });
  }
};

const listRepositoryEvaluations = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });
  try {
    const access = req.user.role === "student"
      ? await getRepositoryMembership(repositoryId, req.user.id)
      : await getRepositoryMentorship(repositoryId, req.user.id);
    if (!access) return res.status(404).json({ message: "Project not found or you do not have access." });
    const visibility = req.user.role === "student" ? "AND e.student_id = ?" : "";
    const params = req.user.role === "student" ? [repositoryId, req.user.id] : [repositoryId];
    const [evaluations] = await db.promise().execute(
      `SELECT e.id, e.milestone_id, e.submission_id, e.student_id, student.name AS student_name,
              evaluator.name AS evaluator_name, e.original_marks, e.deducted_marks,
              e.final_marks, e.deduction_reason, e.evaluation_date
       FROM evaluations e
       INNER JOIN users student ON student.id = e.student_id
       INNER JOIN users evaluator ON evaluator.id = e.evaluator_id
       WHERE e.repository_id = ? ${visibility}
       ORDER BY e.evaluation_date DESC, e.id DESC`,
      params,
    );
    return res.status(200).json({ evaluations });
  } catch (error) {
    console.error("Evaluation list failed:", error);
    return res.status(500).json({ message: "Unable to load evaluations." });
  }
};

module.exports = {
  createEvaluation,
  listRepositoryEvaluations,
  listRepositorySubmissions,
  reviewSubmission,
  submitMilestoneWork,
};
