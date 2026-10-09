const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const uploadRoot = path.resolve(__dirname, "../uploads");
const text = (value, maxLength) =>
  typeof value === "string" && value.trim().length <= maxLength
    ? value.trim()
    : null;

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

const parseSuggestionResponses = (value) => {
  if (value === undefined || value === null || value === "") return [];
  let responses;
  try {
    responses = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
  if (!Array.isArray(responses)) return null;
  const ids = new Set();
  const normalized = [];
  for (const response of responses) {
    const suggestionId = parsePositiveId(response?.suggestionId);
    const responseText = text(response?.response, 10000);
    const status = response?.status;
    if (
      !suggestionId ||
      ids.has(suggestionId) ||
      !responseText ||
      !["ADDRESSED", "IN_PROGRESS"].includes(status)
    ) {
      return null;
    }
    ids.add(suggestionId);
    normalized.push({ suggestionId, response: responseText, status });
  }
  return normalized;
};

const splitUploadedFiles = (files, suggestionIds) => {
  const workFiles = [];
  const suggestionFiles = [];
  for (const file of files || []) {
    if (file.fieldname === "files") {
      workFiles.push({ file, suggestionId: null });
      continue;
    }
    const match = /^suggestion-(\d+)$/.exec(file.fieldname);
    const suggestionId = match ? parsePositiveId(match[1]) : null;
    if (!suggestionId || !suggestionIds.has(suggestionId)) {
      return null;
    }
    suggestionFiles.push({ file, suggestionId });
  }
  return [...workFiles, ...suggestionFiles];
};

const persistUploadedFiles = async (connection, submissionId, uploadedFiles, uploadedBy) => {
  const writtenPaths = [];
  try {
    for (const { file, suggestionId } of uploadedFiles) {
      const extension = path.extname(file.originalname).toLowerCase();
      const relativePath = path.join("submissions", `${crypto.randomUUID()}${extension}`);
      const absolutePath = path.resolve(uploadRoot, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });
      writtenPaths.push(absolutePath);
      await connection.execute(
        `INSERT INTO submission_files
         (submission_id, suggestion_id, file_path, file_name, uploaded_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          submissionId,
          suggestionId,
          relativePath.split(path.sep).join("/"),
          path.basename(file.originalname).slice(0, 255),
          uploadedBy,
        ],
      );
    }
    return writtenPaths;
  } catch (error) {
    await Promise.all(writtenPaths.map((filePath) => fs.unlink(filePath).catch(() => {})));
    throw error;
  }
};

const submitMilestoneWork = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const workUrl = validUrl(req.body.workUrl);
  const notes = text(req.body.notes || "", 10000);
  const suggestionResponses = parseSuggestionResponses(req.body.suggestionResponses);
  if (
    !milestoneId ||
    workUrl === undefined ||
    notes === null ||
    suggestionResponses === null
  ) {
    return res.status(422).json({ message: "Provide valid work notes, links, and suggestion responses." });
  }
  const files = req.files || [];
  const suggestionsById = new Set(suggestionResponses.map(({ suggestionId }) => suggestionId));
  const uploadedFiles = splitUploadedFiles(files, suggestionsById);
  if (!uploadedFiles) {
    return res.status(422).json({ message: "A supporting file is linked to an invalid suggestion." });
  }
  const workFileCount = uploadedFiles.filter(({ suggestionId }) => suggestionId === null).length;
  if (!workUrl && !notes && workFileCount === 0) {
    return res.status(422).json({ message: "Attach milestone work or add a work link or notes." });
  }

  const connection = await db.promise().getConnection();
  let transactionStarted = false;
  let writtenPaths = [];
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [milestones] = await connection.execute(
      `SELECT m.id, m.repository_id, m.order_no, m.title, m.deadline,
              r.name AS project_name, u.name AS submitted_by_name,
              (m.deadline < NOW()) AS is_late
       FROM milestones m
       JOIN repositories r ON r.id = m.repository_id
       JOIN users u ON u.id = ?
       WHERE m.id = ? FOR UPDATE`,
      [req.user.id, milestoneId],
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
    if (Number(milestone.is_late) === 1) {
      await connection.rollback();
      return res.status(409).json({ message: "This milestone's submission deadline has passed. Submissions and revisions are no longer accepted." });
    }

    const [latestRows] = await connection.execute(
      `SELECT id, status, version_number FROM milestone_submissions
       WHERE milestone_id = ? ORDER BY version_number DESC, id DESC LIMIT 1 FOR UPDATE`,
      [milestoneId],
    );
    if (latestRows[0]?.status === "APPROVED") {
      await connection.rollback();
      return res.status(409).json({ message: "This milestone has already been approved." });
    }

    const [outstandingSuggestions] = await connection.execute(
      `SELECT s.id
       FROM milestone_suggestions s
       JOIN milestones source ON source.id = s.milestone_id
       WHERE s.project_id = ? AND source.order_no < ? AND s.status <> 'ACCEPTED'
       ORDER BY source.order_no, s.id`,
      [milestone.repository_id, milestone.order_no],
    );
    const requiredSuggestionIds = outstandingSuggestions.map((suggestion) => Number(suggestion.id));
    if (
      requiredSuggestionIds.length !== suggestionResponses.length ||
      requiredSuggestionIds.some((id) => !suggestionsById.has(id))
    ) {
      await connection.rollback();
      return res.status(422).json({
        message: "Respond to every outstanding suggestion from an earlier milestone before submitting.",
      });
    }

    const versionNumber = Number(latestRows[0]?.version_number || 0) + 1;
    const isLate = Boolean(milestone.is_late);
    const [submissionResult] = await connection.execute(
      `INSERT INTO milestone_submissions
       (milestone_id, submitted_by, work_url, notes, version_number, status, is_late)
       VALUES (?, ?, ?, ?, ?, 'SUBMITTED', ?)`,
      [milestoneId, req.user.id, workUrl, notes || null, versionNumber, isLate],
    );
    const submissionId = submissionResult.insertId;

    for (const response of suggestionResponses) {
      await connection.execute(
        `INSERT INTO submission_suggestion_responses
         (submission_id, suggestion_id, response, status)
         VALUES (?, ?, ?, ?)`,
        [submissionId, response.suggestionId, response.response, response.status],
      );
      await connection.execute(
        `UPDATE milestone_suggestions SET status = ?
         WHERE id = ? AND project_id = ? AND status <> 'ACCEPTED'`,
        [response.status, response.suggestionId, milestone.repository_id],
      );
    }

    writtenPaths = await persistUploadedFiles(
      connection,
      submissionId,
      uploadedFiles,
      req.user.id,
    );
    await connection.execute(
      `UPDATE milestones
       SET status = 'SUBMITTED', submission_status = 'SUBMITTED'
       WHERE id = ?`,
      [milestoneId],
    );

    const [facultyRows] = await connection.execute(
      `SELECT faculty_id FROM mentor_requests
       WHERE repository_id = ? AND status = 'ACCEPTED'`,
      [milestone.repository_id],
    );
    await createNotifications(
      facultyRows.map((row) => row.faculty_id),
      {
        type: "MILESTONE_SUBMITTED",
        title: "Milestone submitted for review",
        message: `${milestone.submitted_by_name} submitted Milestone ${milestone.order_no} (${milestone.title}) for ${milestone.project_name}.`,
        linkUrl: `/repository/${milestone.repository_id}?tab=submissions&submission=${submissionId}`,
      },
      connection,
    );
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: isLate ? "Milestone submitted late for review." : "Milestone submitted on time for review.",
      submissionId,
      versionNumber,
      isLate,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    await Promise.all(writtenPaths.map((filePath) => fs.unlink(filePath).catch(() => {})));
    console.error("Milestone submission failed:", error);
    return res.status(500).json({ message: "Unable to submit milestone work." });
  } finally {
    connection.release();
  }
};

const startSubmissionReview = async (req, res) => {
  const submissionId = parsePositiveId(req.params.submissionId);
  if (!submissionId) return res.status(400).json({ message: "Invalid submission ID." });
  try {
    const [[submission]] = await db.promise().execute(
      `SELECT s.id, s.status, s.milestone_id, m.repository_id
       FROM milestone_submissions s
       JOIN milestones m ON m.id = s.milestone_id
       WHERE s.id = ?`,
      [submissionId],
    );
    if (!submission) return res.status(404).json({ message: "Submission not found." });
    if (!(await getRepositoryMentorship(submission.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned faculty member can review this submission." });
    }
    if (submission.status === "SUBMITTED") {
      const connection = await db.promise().getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          "UPDATE milestone_submissions SET status = 'UNDER_REVIEW' WHERE id = ? AND status = 'SUBMITTED'",
          [submissionId],
        );
        await connection.execute(
          "UPDATE milestones SET status = 'UNDER_REVIEW', submission_status = 'UNDER_REVIEW' WHERE id = ?",
          [submission.milestone_id],
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    return res.status(200).json({ message: "Submission opened for review." });
  } catch (error) {
    console.error("Submission review start failed:", error);
    return res.status(500).json({ message: "Unable to open submission for review." });
  }
};

const reviewSubmission = async (req, res) => {
  const submissionId = parsePositiveId(req.params.submissionId);
  const decision = typeof req.body.decision === "string" ? req.body.decision.toUpperCase() : "";
  const remarks = text(req.body.remarks ?? req.body.feedback ?? "", 10000);
  const improvements = text(req.body.improvements || "", 10000);
  const marksAwarded = Number(req.body.marksAwarded);
  const marksVisibleToStudent = req.body.marksVisibleToStudent === true;
  const suggestions = req.body.suggestions;
  const suggestionReviews = req.body.suggestionReviews;
  if (
    !submissionId ||
    !["APPROVED", "REVISION_REQUIRED"].includes(decision) ||
    remarks === null ||
    improvements === null ||
    !Number.isFinite(marksAwarded) ||
    marksAwarded < 0 ||
    !Array.isArray(suggestions) ||
    suggestions.length > 25 ||
    !Array.isArray(suggestionReviews)
  ) {
    return res.status(422).json({ message: "Provide a valid decision, feedback, marks, and suggestion review." });
  }
  const normalizedSuggestions = [];
  for (const suggestion of suggestions) {
    const suggestionText = text(suggestion?.suggestionText, 5000);
    const improvementText = text(suggestion?.improvementText || "", 5000);
    if (!suggestionText || improvementText === null) {
      return res.status(422).json({ message: "Every suggestion must include valid text." });
    }
    normalizedSuggestions.push({ suggestionText, improvementText });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT s.id, s.status, s.submitted_by, s.milestone_id,
              m.repository_id, m.order_no, m.title AS milestone_title, m.marks,
              r.name AS project_name
       FROM milestone_submissions s
       JOIN milestones m ON m.id = s.milestone_id
       JOIN repositories r ON r.id = m.repository_id
       WHERE s.id = ? FOR UPDATE`,
      [submissionId],
    );
    const submission = rows[0];
    if (!submission) {
      await connection.rollback();
      return res.status(404).json({ message: "Submission not found." });
    }
    if (!(await getRepositoryMentorship(submission.repository_id, req.user.id, connection))) {
      await connection.rollback();
      return res.status(403).json({ message: "Only the assigned faculty member can review this submission." });
    }
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(submission.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Only a pending submission can be reviewed." });
    }
    if (marksAwarded > Number(submission.marks)) {
      await connection.rollback();
      return res.status(422).json({ message: "Awarded marks cannot exceed the milestone allocation." });
    }
    const [[latest]] = await connection.execute(
      `SELECT id FROM milestone_submissions
       WHERE milestone_id = ? ORDER BY version_number DESC, id DESC LIMIT 1`,
      [submission.milestone_id],
    );
    if (Number(latest.id) !== Number(submissionId)) {
      await connection.rollback();
      return res.status(409).json({ message: "Review the latest submission version." });
    }

    const [responseRows] = await connection.execute(
      `SELECT suggestion_id FROM submission_suggestion_responses
       WHERE submission_id = ? ORDER BY suggestion_id`,
      [submissionId],
    );
    const requiredReviewIds = responseRows.map((row) => Number(row.suggestion_id));
    const reviewById = new Map();
    for (const item of suggestionReviews) {
      const suggestionId = parsePositiveId(item?.suggestionId);
      if (
        !suggestionId ||
        reviewById.has(suggestionId) ||
        !["ACCEPTED", "IN_PROGRESS"].includes(item.decision)
      ) {
        await connection.rollback();
        return res.status(422).json({ message: "Choose accepted or needs more work for each carried suggestion." });
      }
      reviewById.set(suggestionId, item.decision);
    }
    if (
      requiredReviewIds.length !== reviewById.size ||
      requiredReviewIds.some((id) => !reviewById.has(id))
    ) {
      await connection.rollback();
      return res.status(422).json({ message: "Review every carried suggestion before saving this review." });
    }

    const [reviewResult] = await connection.execute(
      `INSERT INTO submission_reviews
       (submission_id, reviewed_by, decision, feedback, remarks, improvements,
        marks_awarded, marks_visible_to_student)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        req.user.id,
        decision,
        remarks || null,
        remarks || null,
        improvements || null,
        marksAwarded,
        marksVisibleToStudent,
      ],
    );
    const reviewId = reviewResult.insertId;
    for (const suggestion of normalizedSuggestions) {
      await connection.execute(
        `INSERT INTO milestone_suggestions
         (review_id, project_id, milestone_id, suggestion_text, improvement_text)
         VALUES (?, ?, ?, ?, ?)`,
        [
          reviewId,
          submission.repository_id,
          submission.milestone_id,
          suggestion.suggestionText,
          suggestion.improvementText || null,
        ],
      );
    }
    for (const [suggestionId, suggestionDecision] of reviewById) {
      await connection.execute(
        `UPDATE milestone_suggestions SET status = ?
         WHERE id = ? AND project_id = ?`,
        [suggestionDecision, suggestionId, submission.repository_id],
      );
    }
    await connection.execute(
      "UPDATE milestone_submissions SET status = ? WHERE id = ?",
      [decision, submissionId],
    );
    await connection.execute(
      "UPDATE milestones SET status = ?, submission_status = ? WHERE id = ?",
      [decision, decision, submission.milestone_id],
    );

    const studentIds = await getRepositoryMemberIds(submission.repository_id, connection);
    await createNotifications(
      studentIds.filter((id) => id !== req.user.id),
      {
        type: "SUBMISSION_REVIEWED",
        title: "Faculty feedback added",
        message: `Faculty reviewed Milestone ${submission.order_no} (${submission.milestone_title}) for ${submission.project_name}.`,
        linkUrl: `/repository/${submission.repository_id}?tab=submissions&submission=${submissionId}`,
      },
      connection,
    );
    if (normalizedSuggestions.length > 0) {
      await createNotifications(
        studentIds.filter((id) => id !== req.user.id),
        {
          type: "MILESTONE_SUGGESTIONS_ADDED",
          title: "New milestone suggestions",
          message: `You have new suggestions for Milestone ${submission.order_no} (${submission.milestone_title}) in ${submission.project_name}.`,
          linkUrl: `/repository/${submission.repository_id}?tab=milestones`,
        },
        connection,
      );
    }

    await connection.commit();
    return res.status(201).json({ message: "Review recorded.", reviewId });
  } catch (error) {
    await connection.rollback();
    console.error("Submission review failed:", error);
    return res.status(500).json({ message: "Unable to review submission." });
  } finally {
    connection.release();
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
      `SELECT s.id, s.milestone_id, s.submitted_by, s.work_url, s.notes,
              s.version_number, s.status, s.is_late, s.submitted_at,
              m.repository_id AS repository_id, m.order_no AS milestone_number,
              m.title AS milestone_title,
              m.marks AS allocated_marks, u.name AS submitted_by_name,
              r.name AS project_name,
              (SELECT GROUP_CONCAT(member.name ORDER BY member.name SEPARATOR ', ')
               FROM repository_members rm
               JOIN users member ON member.id = rm.user_id
               WHERE rm.repository_id = r.id) AS group_members
       FROM milestone_submissions s
       JOIN milestones m ON m.id = s.milestone_id
       JOIN repositories r ON r.id = m.repository_id
       JOIN users u ON u.id = s.submitted_by
       WHERE m.repository_id = ?
       ORDER BY m.order_no, s.version_number DESC, s.id DESC`,
      [repositoryId],
    );
    if (submissions.length === 0) return res.status(200).json({ submissions: [] });

    const submissionIds = submissions.map((submission) => submission.id);
    const milestoneIds = [...new Set(submissions.map((submission) => submission.milestone_id))];
    const milestonePlaceholders = milestoneIds.map(() => "?").join(", ");
    const [paperSectionRows] = await db.promise().execute(
      `SELECT link.milestone_id, section.id AS paper_section_id,
              section.section_title, section.section_order
       FROM milestone_paper_sections link
       JOIN paper_sections section ON section.id = link.paper_section_id
       JOIN research_papers paper ON paper.id = section.paper_id
       WHERE paper.project_id = ? AND link.milestone_id IN (${milestonePlaceholders})
       ORDER BY section.section_order`,
      [repositoryId, ...milestoneIds],
    );
    const paperSectionsByMilestone = new Map();
    for (const section of paperSectionRows) {
      const list = paperSectionsByMilestone.get(section.milestone_id) || [];
      list.push({
        id: section.paper_section_id,
        title: section.section_title,
        order: section.section_order,
      });
      paperSectionsByMilestone.set(section.milestone_id, list);
    }
    const placeholders = submissionIds.map(() => "?").join(", ");
    const [reviews] = await db.promise().execute(
      `SELECT sr.id, sr.submission_id, sr.reviewed_by, sr.decision,
              sr.remarks, sr.improvements, sr.marks_visible_to_student,
              sr.reviewed_at, faculty.name AS faculty_name
              ${req.user.role === "faculty" ? ", sr.marks_awarded" : ""}
       FROM submission_reviews sr
       JOIN users faculty ON faculty.id = sr.reviewed_by
       WHERE sr.submission_id IN (${placeholders})
       ORDER BY sr.reviewed_at DESC, sr.id DESC`,
      submissionIds,
    );
    const reviewIds = reviews.map((review) => review.id);
    const reviewPlaceholders = reviewIds.map(() => "?").join(", ");
    const [suggestions] = reviewIds.length
      ? await db.promise().execute(
        `SELECT id, review_id, milestone_id, suggestion_text, improvement_text, status, created_at
         FROM milestone_suggestions WHERE review_id IN (${reviewPlaceholders})
         ORDER BY id`,
        reviewIds,
      )
      : [[]];
    const [responses] = await db.promise().execute(
      `SELECT sr.submission_id, sr.suggestion_id, sr.response, sr.status,
              suggestion.suggestion_text, suggestion.improvement_text,
              suggestion.status AS faculty_status, source.order_no AS source_milestone_number,
              source.title AS source_milestone_title
       FROM submission_suggestion_responses sr
       JOIN milestone_suggestions suggestion ON suggestion.id = sr.suggestion_id
       JOIN milestones source ON source.id = suggestion.milestone_id
       WHERE sr.submission_id IN (${placeholders})
       ORDER BY source.order_no, suggestion.id`,
      submissionIds,
    );
    const [files] = await db.promise().execute(
      `SELECT id, submission_id, suggestion_id, file_name, uploaded_at
       FROM submission_files WHERE submission_id IN (${placeholders})
       ORDER BY uploaded_at, id`,
      submissionIds,
    );

    const suggestionsByReview = new Map();
    for (const suggestion of suggestions) {
      const list = suggestionsByReview.get(suggestion.review_id) || [];
      list.push(suggestion);
      suggestionsByReview.set(suggestion.review_id, list);
    }
    const reviewsBySubmission = new Map();
    for (const review of reviews) {
      if (req.user.role === "student" && review.marks_visible_to_student) {
        const [[markRow]] = await db.promise().execute(
          "SELECT marks_awarded FROM submission_reviews WHERE id = ?",
          [review.id],
        );
        review.marks_awarded = markRow.marks_awarded;
      }
      if (req.user.role === "student" && !review.marks_visible_to_student) {
        delete review.marks_visible_to_student;
      }
      review.suggestions = suggestionsByReview.get(review.id) || [];
      const list = reviewsBySubmission.get(review.submission_id) || [];
      list.push(review);
      reviewsBySubmission.set(review.submission_id, list);
    }
    const responsesBySubmission = new Map();
    for (const response of responses) {
      const list = responsesBySubmission.get(response.submission_id) || [];
      list.push(response);
      responsesBySubmission.set(response.submission_id, list);
    }
    const filesBySubmission = new Map();
    for (const file of files) {
      const list = filesBySubmission.get(file.submission_id) || [];
      list.push({
        ...file,
        download_url: `/api/submissions/files/${file.id}`,
      });
      filesBySubmission.set(file.submission_id, list);
    }
    for (const submission of submissions) {
      submission.reviews = reviewsBySubmission.get(submission.id) || [];
      submission.latest_review = submission.reviews[0] || null;
      submission.suggestion_responses = responsesBySubmission.get(submission.id) || [];
      submission.files = filesBySubmission.get(submission.id) || [];
      submission.paper_sections = paperSectionsByMilestone.get(submission.milestone_id) || [];
    }
    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Submission list failed:", error);
    return res.status(500).json({ message: "Unable to load repository submissions." });
  }
};

const downloadSubmissionFile = async (req, res) => {
  const fileId = parsePositiveId(req.params.fileId);
  if (!fileId) return res.status(400).json({ message: "Invalid file ID." });
  try {
    const [[file]] = await db.promise().execute(
      `SELECT sf.file_path, sf.file_name, m.repository_id
       FROM submission_files sf
       JOIN milestone_submissions s ON s.id = sf.submission_id
       JOIN milestones m ON m.id = s.milestone_id
       WHERE sf.id = ?`,
      [fileId],
    );
    if (!file) return res.status(404).json({ message: "Submission file not found." });
    const access = req.user.role === "student"
      ? await getRepositoryMembership(file.repository_id, req.user.id)
      : await getRepositoryMentorship(file.repository_id, req.user.id);
    if (!access) return res.status(404).json({ message: "Submission file not found." });

    const absolutePath = path.resolve(uploadRoot, file.file_path);
    if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
      return res.status(500).json({ message: "Submission file path is invalid." });
    }
    return res.download(absolutePath, file.file_name, (error) => {
      if (error && !res.headersSent) {
        console.error("Submission file download failed:", error);
        res.status(404).json({ message: "Submission file is unavailable." });
      }
    });
  } catch (error) {
    console.error("Submission file lookup failed:", error);
    return res.status(500).json({ message: "Unable to download submission file." });
  }
};

module.exports = {
  downloadSubmissionFile,
  listRepositorySubmissions,
  reviewSubmission,
  startSubmissionReview,
  submitMilestoneWork,
};
