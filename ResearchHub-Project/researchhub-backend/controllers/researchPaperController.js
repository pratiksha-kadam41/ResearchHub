const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const execute = (connection, sql, bindings = []) =>
  typeof connection.promise === "function"
    ? connection.promise().execute(sql, bindings)
    : connection.execute(sql, bindings);

const canAccessPaperProject = async (projectId, user, connection = db) => {
  if (user.role === "student") {
    return getRepositoryMembership(projectId, user.id, connection);
  }
  if (user.role === "faculty") {
    return getRepositoryMentorship(projectId, user.id, connection);
  }
  return null;
};

const flattenText = (node) => {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text" && typeof node.text === "string") return node.text;
  return (Array.isArray(node.content) ? node.content : [])
    .map(flattenText)
    .join(node.type === "paragraph" || node.type === "heading" || node.type === "listItem" ? " " : "");
};

const parseEditorDocument = (content) => {
  if (typeof content !== "string" || content.length > 2_000_000) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || parsed.type !== "doc" || !Array.isArray(parsed.content)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getPaperWorkspace = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  if (!projectId) return res.status(400).json({ message: "Invalid project ID." });

  try {
    if (!(await canAccessPaperProject(projectId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }

    const [[project]] = await db.promise().execute(
      `SELECT r.id, r.name, r.description, r.owner_id,
              faculty.name AS faculty_name,
              COALESCE(owner.institution, faculty.institution, '') AS institution
       FROM repositories r
       LEFT JOIN mentor_requests mr ON mr.repository_id = r.id AND mr.status = 'ACCEPTED'
       LEFT JOIN users faculty ON faculty.id = mr.faculty_id
       LEFT JOIN users owner ON owner.id = r.owner_id
       WHERE r.id = ?`,
      [projectId],
    );
    if (!project) return res.status(404).json({ message: "Project not found." });

    const [templates] = await db.promise().execute(
      `SELECT id, name, description, type
       FROM paper_templates
       WHERE is_active = TRUE
       ORDER BY FIELD(type, 'STANDARD', 'IEEE', 'REVIEW'), id`,
    );
    if (templates.length) {
      const [templateSections] = await db.promise().execute(
        `SELECT template_id, section_name, section_order, is_required, description
         FROM paper_template_sections
         WHERE template_id IN (${templates.map(() => "?").join(", ")})
         ORDER BY template_id, section_order`,
        templates.map((template) => template.id),
      );
      const sectionsByTemplate = new Map();
      for (const section of templateSections) {
        const sections = sectionsByTemplate.get(section.template_id) || [];
        sections.push(section);
        sectionsByTemplate.set(section.template_id, sections);
      }
      for (const template of templates) {
        template.sections = sectionsByTemplate.get(template.id) || [];
      }
    }
    const [[paper]] = await db.promise().execute(
      `SELECT p.id, p.project_id, p.template_id, p.title, p.status,
              p.created_by, p.created_at, p.updated_at, t.name AS template_name,
              creator.name AS created_by_name
       FROM research_papers p
       JOIN paper_templates t ON t.id = p.template_id
       JOIN users creator ON creator.id = p.created_by
       WHERE p.project_id = ?`,
      [projectId],
    );
    if (!paper) {
      return res.status(200).json({ project, templates, paper: null, sections: [], milestones: [] });
    }

    const [sections] = await db.promise().execute(
      `SELECT s.id, s.template_section_id, s.section_title, s.section_key,
              s.section_order, s.content, s.status, s.word_count, s.updated_by,
              s.created_at, s.updated_at, u.name AS updated_by_name,
              COALESCE(ts.is_required, TRUE) AS is_required,
              EXISTS (
                SELECT 1 FROM paper_section_versions v WHERE v.section_id = s.id
              ) AS has_history
       FROM paper_sections s
       LEFT JOIN paper_template_sections ts ON ts.id = s.template_section_id
       LEFT JOIN users u ON u.id = s.updated_by
       WHERE s.paper_id = ?
       ORDER BY s.section_order, s.id`,
      [paper.id],
    );
    const [milestones] = await db.promise().execute(
      `SELECT m.id, m.order_no, m.title,
              s.id AS paper_section_id, s.section_title, s.section_order
       FROM milestones m
       LEFT JOIN milestone_paper_sections link ON link.milestone_id = m.id
       LEFT JOIN paper_sections s ON s.id = link.paper_section_id AND s.paper_id = ?
       WHERE m.repository_id = ?
       ORDER BY m.order_no, s.section_order`,
      [paper.id, projectId],
    );
    const groupedMilestones = new Map();
    for (const milestone of milestones) {
      if (!groupedMilestones.has(milestone.id)) {
        groupedMilestones.set(milestone.id, {
          id: milestone.id,
          order_no: milestone.order_no,
          title: milestone.title,
          sections: [],
        });
      }
      if (milestone.paper_section_id) {
        groupedMilestones.get(milestone.id).sections.push({
          id: milestone.paper_section_id,
          title: milestone.section_title,
          order: milestone.section_order,
        });
      }
    }

    const requiredSections = sections.filter(
      (section) => section.is_required && section.status === "COMPLETED",
    );
    const requiredSectionCount = sections.filter((section) => section.is_required).length;
    const [members] = await db.promise().execute(
      `SELECT u.id, u.name, rm.member_role
       FROM repository_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.repository_id = ?
       ORDER BY rm.member_role DESC, u.name`,
      [projectId],
    );

    return res.status(200).json({
      project,
      templates,
      paper,
      sections,
      milestones: [...groupedMilestones.values()],
      members,
      completion: requiredSectionCount
        ? Math.round((requiredSections.length / requiredSectionCount) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Research paper workspace failed:", error);
    return res.status(500).json({ message: "Unable to load the research paper workspace." });
  }
};

const createPaperFromTemplate = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  const templateId = parsePositiveId(req.body.templateId);
  if (!projectId || !templateId) {
    return res.status(422).json({ message: "Choose a valid research paper template." });
  }

  const connection = await db.promise().getConnection();
  try {
    if (req.user.role !== "student" || !(await canAccessPaperProject(projectId, req.user, connection))) {
      return res.status(403).json({ message: "Only a project member can create its research paper." });
    }
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM repositories WHERE id = ? FOR UPDATE", [projectId]);
    const [[facultyCollaborator]] = await connection.execute(
      `SELECT id FROM mentor_requests
       WHERE repository_id = ? AND status = 'ACCEPTED'
       LIMIT 1`,
      [projectId],
    );
    if (!facultyCollaborator) {
      await connection.rollback();
      return res.status(409).json({
        message: "Connect with a faculty collaborator before creating the research paper.",
      });
    }
    const [[existingPaper]] = await connection.execute(
      "SELECT id FROM research_papers WHERE project_id = ?",
      [projectId],
    );
    if (existingPaper) {
      await connection.rollback();
      return res.status(409).json({ message: "This project already has a research paper." });
    }
    const [[template]] = await connection.execute(
      `SELECT id, name FROM paper_templates WHERE id = ? AND is_active = TRUE`,
      [templateId],
    );
    if (!template) {
      await connection.rollback();
      return res.status(404).json({ message: "Research paper template not found." });
    }
    const [templateSections] = await connection.execute(
      `SELECT id, section_name, section_key, section_order
       FROM paper_template_sections WHERE template_id = ? ORDER BY section_order, id`,
      [templateId],
    );
    if (!templateSections.length) {
      await connection.rollback();
      return res.status(409).json({ message: "This template has no sections configured." });
    }

    const [[project]] = await connection.execute(
      "SELECT name FROM repositories WHERE id = ?",
      [projectId],
    );
    const [result] = await connection.execute(
      `INSERT INTO research_papers (project_id, template_id, title, created_by)
       VALUES (?, ?, ?, ?)`,
      [projectId, templateId, project.name, req.user.id],
    );
    const emptyDocument = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    const titleDocument = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: project.name }] }],
    });
    for (const section of templateSections) {
      const initialContent = section.section_key === "title" ? titleDocument : emptyDocument;
      await connection.execute(
        `INSERT INTO paper_sections
         (paper_id, template_section_id, section_title, section_key,
          section_order, content, status, word_count, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          section.id,
          section.section_name,
          section.section_key,
          section.section_order,
          initialContent,
          section.section_key === "title" ? "COMPLETED" : "NOT_STARTED",
          section.section_key === "title" ? project.name.trim().split(/\s+/).length : 0,
          req.user.id,
        ],
      );
    }
    const memberIds = await getRepositoryMemberIds(projectId, connection);
    await createNotifications(memberIds, {
      type: "RESEARCH_PAPER_CREATED",
      title: "Research paper workspace created",
      message: `A ${template.name} paper is ready in the project workspace.`,
      linkUrl: `/repository/${projectId}?tab=research-paper`,
    }, connection);
    await connection.commit();
    return res.status(201).json({
      message: "Research paper workspace created from the selected template.",
      paperId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "This project already has a research paper." });
    }
    console.error("Research paper creation failed:", error);
    return res.status(500).json({ message: "Unable to create the research paper." });
  } finally {
    connection.release();
  }
};

const savePaperSection = async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only project students can edit research paper sections." });
  }
  const paperId = parsePositiveId(req.params.paperId);
  const sectionId = parsePositiveId(req.params.sectionId);
  const document = parseEditorDocument(req.body.content);
  if (!paperId || !sectionId || !document) {
    return res.status(422).json({ message: "Provide valid paper section content." });
  }

  const plainText = flattenText(document).replace(/\s+/g, " ").trim();
  const wordCount = plainText ? plainText.split(" ").filter(Boolean).length : 0;
  const serialized = JSON.stringify(document);
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [[section]] = await connection.execute(
      `SELECT s.id, s.paper_id, s.section_key, s.content, p.project_id
       FROM paper_sections s
       JOIN research_papers p ON p.id = s.paper_id
       WHERE s.id = ? AND s.paper_id = ? FOR UPDATE`,
      [sectionId, paperId],
    );
    if (!section) {
      await connection.rollback();
      return res.status(404).json({ message: "Paper section not found." });
    }
    if (!(await canAccessPaperProject(section.project_id, req.user, connection))) {
      await connection.rollback();
      return res.status(404).json({ message: "Research paper not found or you do not have access." });
    }
    const [[latestSubmission]] = await connection.execute(
      `SELECT status
       FROM paper_submissions
       WHERE paper_id = ?
       ORDER BY version_number DESC
       LIMIT 1 FOR UPDATE`,
      [paperId],
    );
    if (latestSubmission && ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(latestSubmission.status)) {
      await connection.rollback();
      return res.status(409).json({
        message: latestSubmission.status === "APPROVED"
          ? "This research paper has been approved and is locked."
          : "This submitted paper is with faculty for evaluation and is locked.",
      });
    }
    if (section.content !== serialized) {
      const [[version]] = await connection.execute(
        "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM paper_section_versions WHERE section_id = ?",
        [sectionId],
      );
      await connection.execute(
        `INSERT INTO paper_section_versions
         (paper_id, section_id, updated_by, content, version_number)
         VALUES (?, ?, ?, ?, ?)`,
        [paperId, sectionId, req.user.id, serialized, Number(version.next_version)],
      );
      await connection.execute(
        `UPDATE paper_sections
         SET content = ?, word_count = ?, status = ?, updated_by = ?
         WHERE id = ?`,
        [
          serialized,
          wordCount,
          wordCount ? "COMPLETED" : "NOT_STARTED",
          req.user.id,
          sectionId,
        ],
      );
      const paperTitle = section.section_key === "title" ? plainText.slice(0, 500) : null;
      await connection.execute(
        `UPDATE research_papers
         SET title = COALESCE(?, title),
             status = CASE WHEN status = 'DRAFT' AND ? > 0 THEN 'IN_PROGRESS' ELSE status END
         WHERE id = ?`,
        [paperTitle, wordCount, paperId],
      );
    }
    await connection.commit();
    return res.status(200).json({ message: "Section saved.", wordCount });
  } catch (error) {
    await connection.rollback();
    console.error("Research paper section save failed:", error);
    return res.status(500).json({ message: "Unable to save this paper section." });
  } finally {
    connection.release();
  }
};

const getPaperSectionHistory = async (req, res) => {
  const paperId = parsePositiveId(req.params.paperId);
  const sectionId = parsePositiveId(req.params.sectionId);
  if (!paperId || !sectionId) return res.status(400).json({ message: "Invalid paper section." });
  try {
    const [[section]] = await db.promise().execute(
      `SELECT p.project_id FROM paper_sections s
       JOIN research_papers p ON p.id = s.paper_id
       WHERE s.id = ? AND s.paper_id = ?`,
      [sectionId, paperId],
    );
    if (!section || !(await canAccessPaperProject(section.project_id, req.user))) {
      return res.status(404).json({ message: "Paper section history not found." });
    }
    const [versions] = await db.promise().execute(
      `SELECT v.id, v.version_number, v.content, v.created_at,
              u.id AS updated_by, u.name AS updated_by_name
       FROM paper_section_versions v
       JOIN users u ON u.id = v.updated_by
       WHERE v.paper_id = ? AND v.section_id = ?
       ORDER BY v.version_number DESC`,
      [paperId, sectionId],
    );
    return res.status(200).json({ versions });
  } catch (error) {
    console.error("Research paper history lookup failed:", error);
    return res.status(500).json({ message: "Unable to load paper history." });
  }
};

const listPaperSubmissions = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  if (!projectId) return res.status(400).json({ message: "Invalid project ID." });
  try {
    if (!(await canAccessPaperProject(projectId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }
    const [[paper]] = await db.promise().execute(
      "SELECT id FROM research_papers WHERE project_id = ?",
      [projectId],
    );
    if (!paper) return res.status(200).json({ submissions: [] });

    const [submissions] = await db.promise().execute(
      `SELECT s.id, s.version_number, s.paper_snapshot, s.student_notes,
              s.status, s.submitted_at, u.name AS submitted_by_name
       FROM paper_submissions s
       JOIN users u ON u.id = s.submitted_by
       WHERE s.paper_id = ?
       ORDER BY s.version_number DESC`,
      [paper.id],
    );
    if (!submissions.length) return res.status(200).json({ submissions: [] });

    const submissionIds = submissions.map((submission) => submission.id);
    const placeholders = submissionIds.map(() => "?").join(", ");
    const [reviews] = await db.promise().execute(
      `SELECT r.id, r.submission_id, r.reviewer_id, reviewer.name AS reviewer_name,
              r.decision, r.remarks, r.improvements, r.marks_awarded,
              r.marks_visible_to_student, r.reviewed_at
       FROM paper_submission_reviews r
       JOIN users reviewer ON reviewer.id = r.reviewer_id
       WHERE r.submission_id IN (${placeholders})
       ORDER BY r.reviewed_at DESC`,
      submissionIds,
    );
    const reviewIds = reviews.map((review) => review.id);
    const reviewSuggestions = reviewIds.length
      ? (await db.promise().execute(
          `SELECT id, review_id, suggestion_text, status, created_at
           FROM paper_review_suggestions
           WHERE review_id IN (${reviewIds.map(() => "?").join(", ")})
           ORDER BY id`,
          reviewIds,
        ))[0]
      : [];
    const [responses] = await db.promise().execute(
      `SELECT response.submission_id, response.suggestion_id,
              response.response, response.response_status,
              suggestion.suggestion_text, suggestion.status AS suggestion_status,
              source.version_number AS from_version
       FROM paper_submission_suggestion_responses response
       JOIN paper_review_suggestions suggestion ON suggestion.id = response.suggestion_id
       JOIN paper_submission_reviews source_review ON source_review.id = suggestion.review_id
       JOIN paper_submissions source ON source.id = source_review.submission_id
       WHERE response.submission_id IN (${placeholders})
       ORDER BY source.version_number, suggestion.id`,
      submissionIds,
    );
    const reviewsBySubmission = new Map();
    for (const review of reviews) {
      const visibleToStudent = req.user.role === "faculty" || Number(review.marks_visible_to_student) === 1;
      const item = {
        ...review,
        suggestions: reviewSuggestions.filter((suggestion) => suggestion.review_id === review.id),
      };
      if (!visibleToStudent) delete item.marks_awarded;
      const list = reviewsBySubmission.get(review.submission_id) || [];
      list.push(item);
      reviewsBySubmission.set(review.submission_id, list);
    }
    return res.status(200).json({
      submissions: submissions.map((submission) => ({
        ...submission,
        paper_snapshot: JSON.parse(submission.paper_snapshot),
        reviews: reviewsBySubmission.get(submission.id) || [],
        suggestion_responses: responses.filter((response) => response.submission_id === submission.id),
      })),
    });
  } catch (error) {
    console.error("Research paper submissions lookup failed:", error);
    return res.status(500).json({ message: "Unable to load research paper submissions." });
  }
};

const submitPaperForReview = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  const studentNotes = typeof req.body.studentNotes === "string" ? req.body.studentNotes.trim() : "";
  const rawResponses = req.body.suggestionResponses;
  if (!projectId || studentNotes.length > 10000 || !Array.isArray(rawResponses)) {
    return res.status(422).json({ message: "Provide valid paper submission details." });
  }
  const suggestionResponses = [];
  const seenSuggestionIds = new Set();
  for (const item of rawResponses) {
    const suggestionId = parsePositiveId(item?.suggestionId);
    const response = typeof item?.response === "string" ? item.response.trim() : "";
    if (
      !suggestionId ||
      seenSuggestionIds.has(suggestionId) ||
      !response ||
      response.length > 10000 ||
      !["ADDRESSED", "IN_PROGRESS"].includes(item?.status)
    ) {
      return res.status(422).json({ message: "Respond to each previous suggestion with a valid response." });
    }
    seenSuggestionIds.add(suggestionId);
    suggestionResponses.push({ suggestionId, response, status: item.status });
  }

  const connection = await db.promise().getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    if (!(await getRepositoryMembership(projectId, req.user.id, connection))) {
      await connection.rollback();
      return res.status(403).json({ message: "Only an accepted project member can submit this paper." });
    }
    const [[paper]] = await connection.execute(
      `SELECT p.id, p.title, p.status, t.name AS template_name,
              r.id AS project_id, r.name AS project_name,
              COALESCE(owner.institution, faculty.institution, '') AS institution
       FROM research_papers p
       JOIN paper_templates t ON t.id = p.template_id
       JOIN repositories r ON r.id = p.project_id
       LEFT JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN mentor_requests mr ON mr.repository_id = r.id AND mr.status = 'ACCEPTED'
       LEFT JOIN users faculty ON faculty.id = mr.faculty_id
       WHERE p.project_id = ? FOR UPDATE`,
      [projectId],
    );
    if (!paper) {
      await connection.rollback();
      return res.status(404).json({ message: "Create a research paper before submitting it." });
    }
    const [[latest]] = await connection.execute(
      `SELECT id, status FROM paper_submissions
       WHERE paper_id = ?
       ORDER BY version_number DESC
       LIMIT 1 FOR UPDATE`,
      [paper.id],
    );
    if (latest && ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(latest.status)) {
      await connection.rollback();
      return res.status(409).json({
        message: latest.status === "APPROVED"
          ? "This paper has already been approved."
          : "The current paper version is already waiting for faculty review.",
      });
    }

    const [sections] = await connection.execute(
      `SELECT s.id, s.section_title, s.section_key, s.section_order,
              s.content, s.word_count, COALESCE(ts.is_required, TRUE) AS is_required
       FROM paper_sections s
       LEFT JOIN paper_template_sections ts ON ts.id = s.template_section_id
       WHERE s.paper_id = ?
       ORDER BY s.section_order, s.id`,
      [paper.id],
    );
    if (
      !sections.length ||
      sections.some((section) => Number(section.is_required) === 1 && Number(section.word_count) === 0)
    ) {
      await connection.rollback();
      return res.status(409).json({ message: "Complete every required paper section before submitting for evaluation." });
    }

    const [outstandingSuggestions] = await connection.execute(
      `SELECT suggestion.id
       FROM paper_review_suggestions suggestion
       JOIN paper_submission_reviews review ON review.id = suggestion.review_id
       JOIN paper_submissions prior ON prior.id = review.submission_id
       WHERE prior.paper_id = ? AND suggestion.status <> 'ACCEPTED'
       ORDER BY prior.version_number, suggestion.id`,
      [paper.id],
    );
    const requiredSuggestionIds = outstandingSuggestions.map((suggestion) => Number(suggestion.id));
    if (
      requiredSuggestionIds.length !== suggestionResponses.length ||
      requiredSuggestionIds.some((id) => !seenSuggestionIds.has(id))
    ) {
      await connection.rollback();
      return res.status(422).json({ message: "Respond to every outstanding faculty suggestion before submitting the next paper version." });
    }

    const [members] = await connection.execute(
      `SELECT u.name
       FROM repository_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.repository_id = ?
       ORDER BY u.name`,
      [projectId],
    );
    const snapshot = {
      title: paper.title,
      template_name: paper.template_name,
      project_name: paper.project_name,
      institution: paper.institution,
      authors: members.map((member) => member.name),
      sections: sections.map(({ id, section_title, section_key, section_order, content }) => ({
        id,
        section_title,
        section_key,
        section_order,
        content,
      })),
    };
    const [[versionRow]] = await connection.execute(
      "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM paper_submissions WHERE paper_id = ?",
      [paper.id],
    );
    const [insertResult] = await connection.execute(
      `INSERT INTO paper_submissions
       (paper_id, submitted_by, version_number, paper_snapshot, student_notes, status)
       VALUES (?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        paper.id,
        req.user.id,
        Number(versionRow.next_version),
        JSON.stringify(snapshot),
        studentNotes || null,
      ],
    );
    const submissionId = insertResult.insertId;
    for (const response of suggestionResponses) {
      await connection.execute(
        `INSERT INTO paper_submission_suggestion_responses
         (submission_id, suggestion_id, response, response_status)
         VALUES (?, ?, ?, ?)`,
        [submissionId, response.suggestionId, response.response, response.status],
      );
    }
    await connection.execute(
      "UPDATE research_papers SET status = 'READY_FOR_REVIEW' WHERE id = ?",
      [paper.id],
    );
    const [facultyRows] = await connection.execute(
      "SELECT faculty_id FROM mentor_requests WHERE repository_id = ? AND status = 'ACCEPTED'",
      [projectId],
    );
    await createNotifications(
      facultyRows.map((row) => row.faculty_id),
      {
        type: "RESEARCH_PAPER_SUBMITTED",
        title: "Research paper submitted for evaluation",
        message: `A new version of the research paper for ${paper.project_name} is ready for your review.`,
        linkUrl: `/repository/${projectId}?tab=evaluations#paper-evaluation-${submissionId}`,
      },
      connection,
    );
    await connection.commit();
    transactionStarted = false;
    return res.status(201).json({
      message: `Research paper version ${Number(versionRow.next_version)} submitted for faculty evaluation.`,
      submissionId,
      versionNumber: Number(versionRow.next_version),
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error("Research paper submission failed:", error);
    return res.status(500).json({ message: "Unable to submit the research paper for evaluation." });
  } finally {
    connection.release();
  }
};

const reviewPaperSubmission = async (req, res) => {
  const submissionId = parsePositiveId(req.params.submissionId);
  const decision = typeof req.body.decision === "string" ? req.body.decision.toUpperCase() : "";
  const marksAwarded = Number(req.body.marksAwarded);
  const remarks = typeof req.body.remarks === "string" ? req.body.remarks.trim() : "";
  const improvements = typeof req.body.improvements === "string" ? req.body.improvements.trim() : "";
  const marksVisibleToStudent = req.body.marksVisibleToStudent === true;
  const rawSuggestions = req.body.suggestions;
  const rawSuggestionReviews = req.body.suggestionReviews;
  if (
    !submissionId ||
    !["APPROVED", "REVISION_REQUIRED"].includes(decision) ||
    !Number.isFinite(marksAwarded) ||
    marksAwarded < 0 ||
    marksAwarded > 100 ||
    remarks.length > 10000 ||
    improvements.length > 10000 ||
    !Array.isArray(rawSuggestions) ||
    !Array.isArray(rawSuggestionReviews)
  ) {
    return res.status(422).json({ message: "Provide a valid decision, marks, feedback, and suggestions." });
  }
  const suggestions = [];
  for (const item of rawSuggestions) {
    const suggestionText = typeof item?.suggestionText === "string" ? item.suggestionText.trim() : "";
    if (!suggestionText || suggestionText.length > 5000) {
      return res.status(422).json({ message: "Each suggestion must contain up to 5,000 characters." });
    }
    suggestions.push(suggestionText);
  }
  const suggestionReviews = [];
  const seenSuggestionIds = new Set();
  for (const item of rawSuggestionReviews) {
    const suggestionId = parsePositiveId(item?.suggestionId);
    const status = typeof item?.decision === "string" ? item.decision.toUpperCase() : "";
    if (!suggestionId || seenSuggestionIds.has(suggestionId) || !["ACCEPTED", "IN_PROGRESS"].includes(status)) {
      return res.status(422).json({ message: "Provide a valid faculty decision for each previous suggestion." });
    }
    seenSuggestionIds.add(suggestionId);
    suggestionReviews.push({ suggestionId, status });
  }
  if (
    decision === "APPROVED" &&
    (suggestions.length > 0 || suggestionReviews.some((item) => item.status !== "ACCEPTED"))
  ) {
    return res.status(422).json({
      message: "Resolve all previous suggestions and choose Revision required if adding new suggestions.",
    });
  }

  const connection = await db.promise().getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [[submission]] = await connection.execute(
      `SELECT s.id, s.paper_id, s.status, paper.project_id, project.name AS project_name
       FROM paper_submissions s
       JOIN research_papers paper ON paper.id = s.paper_id
       JOIN repositories project ON project.id = paper.project_id
       WHERE s.id = ? FOR UPDATE`,
      [submissionId],
    );
    if (!submission) {
      await connection.rollback();
      return res.status(404).json({ message: "Paper submission not found." });
    }
    if (!(await getRepositoryMentorship(submission.project_id, req.user.id, connection))) {
      await connection.rollback();
      return res.status(403).json({ message: "Only assigned faculty can review this paper." });
    }
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(submission.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "This paper version has already been evaluated." });
    }
    const [responses] = await connection.execute(
      `SELECT suggestion_id
       FROM paper_submission_suggestion_responses
       WHERE submission_id = ?`,
      [submissionId],
    );
    const requiredSuggestionIds = responses.map((response) => Number(response.suggestion_id));
    if (
      requiredSuggestionIds.length !== suggestionReviews.length ||
      requiredSuggestionIds.some((id) => !seenSuggestionIds.has(id))
    ) {
      await connection.rollback();
      return res.status(422).json({ message: "Evaluate every previous suggestion response before saving this review." });
    }
    const [reviewResult] = await connection.execute(
      `INSERT INTO paper_submission_reviews
       (submission_id, reviewer_id, decision, remarks, improvements, marks_awarded, marks_visible_to_student)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        req.user.id,
        decision,
        remarks || null,
        improvements || null,
        marksAwarded,
        marksVisibleToStudent,
      ],
    );
    for (const suggestionReview of suggestionReviews) {
      await connection.execute(
        `UPDATE paper_review_suggestions suggestion
         JOIN paper_submission_suggestion_responses response
           ON response.suggestion_id = suggestion.id AND response.submission_id = ?
         SET suggestion.status = ?
         WHERE suggestion.id = ?`,
        [submissionId, suggestionReview.status, suggestionReview.suggestionId],
      );
    }
    for (const suggestionText of suggestions) {
      await connection.execute(
        `INSERT INTO paper_review_suggestions (review_id, suggestion_text)
         VALUES (?, ?)`,
        [reviewResult.insertId, suggestionText],
      );
    }
    await connection.execute(
      "UPDATE paper_submissions SET status = ? WHERE id = ?",
      [decision, submissionId],
    );
    await connection.execute(
      "UPDATE research_papers SET status = ? WHERE id = ?",
      [decision === "APPROVED" ? "COMPLETED" : "IN_PROGRESS", submission.paper_id],
    );
    const memberIds = await getRepositoryMemberIds(submission.project_id, connection);
    await createNotifications(
      memberIds,
      {
        type: "RESEARCH_PAPER_REVIEWED",
        title: decision === "APPROVED" ? "Research paper evaluation completed" : "Research paper improvements requested",
        message: `Faculty reviewed the submitted research paper for ${submission.project_name}.`,
        linkUrl: `/repository/${submission.project_id}?tab=evaluations#paper-evaluation-${submissionId}`,
      },
      connection,
    );
    await connection.commit();
    transactionStarted = false;
    return res.status(200).json({ message: "Research paper evaluation saved.", decision });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error("Research paper review failed:", error);
    return res.status(500).json({ message: "Unable to save the research paper evaluation." });
  } finally {
    connection.release();
  }
};

const updatePaperStatus = async (req, res) => {
  const paperId = parsePositiveId(req.params.paperId);
  const status = typeof req.body.status === "string" ? req.body.status.toUpperCase() : "";
  if (!paperId || !["DRAFT", "IN_PROGRESS", "READY_FOR_REVIEW", "COMPLETED"].includes(status)) {
    return res.status(422).json({ message: "Provide a valid paper status." });
  }
  try {
    const [[paper]] = await db.promise().execute(
      "SELECT project_id FROM research_papers WHERE id = ?",
      [paperId],
    );
    if (!paper || !(await canAccessPaperProject(paper.project_id, req.user))) {
      return res.status(404).json({ message: "Research paper not found." });
    }
    if (
      (status === "COMPLETED" && req.user.role !== "faculty") ||
      (req.user.role === "faculty" && status !== "COMPLETED" && status !== "READY_FOR_REVIEW")
    ) {
      return res.status(403).json({ message: "You cannot set this paper status." });
    }
    if (status === "COMPLETED" || status === "READY_FOR_REVIEW") {
      const [[completion]] = await db.promise().execute(
        `SELECT COUNT(*) AS required_count,
                COALESCE(SUM(s.status = 'COMPLETED'), 0) AS completed_count
         FROM paper_sections s
         LEFT JOIN paper_template_sections ts ON ts.id = s.template_section_id
         WHERE s.paper_id = ? AND (ts.id IS NULL OR ts.is_required = TRUE)`,
        [paperId],
      );
      if (Number(completion.completed_count || 0) < Number(completion.required_count || 0)) {
        return res.status(409).json({ message: "Complete every required paper section before changing this status." });
      }
    }
    await db.promise().execute(
      "UPDATE research_papers SET status = ? WHERE id = ?",
      [status, paperId],
    );
    return res.status(200).json({ message: "Paper status updated.", status });
  } catch (error) {
    console.error("Research paper status update failed:", error);
    return res.status(500).json({ message: "Unable to update the paper status." });
  }
};

const updateMilestonePaperSections = async (req, res) => {
  const projectId = parsePositiveId(req.params.projectId);
  const links = req.body.links;
  if (!projectId || !Array.isArray(links)) {
    return res.status(422).json({ message: "Provide valid milestone section links." });
  }
  const normalized = [];
  for (const link of links) {
    const milestoneId = parsePositiveId(link?.milestoneId);
    const sectionIds = Array.isArray(link?.sectionIds)
      ? [...new Set(link.sectionIds.map(parsePositiveId))]
      : null;
    if (!milestoneId || !sectionIds || sectionIds.some((id) => !id)) {
      return res.status(422).json({ message: "Milestone and section IDs must be valid." });
    }
    normalized.push({ milestoneId, sectionIds });
  }

  const connection = await db.promise().getConnection();
  try {
    if (req.user.role !== "faculty" || !(await getRepositoryMentorship(projectId, req.user.id, connection))) {
      return res.status(403).json({ message: "Only assigned faculty can link paper sections to milestones." });
    }
    await connection.beginTransaction();
    const [[paper]] = await connection.execute(
      "SELECT id FROM research_papers WHERE project_id = ? FOR UPDATE",
      [projectId],
    );
    if (!paper) {
      await connection.rollback();
      return res.status(404).json({ message: "Create a research paper before linking its sections." });
    }

    for (const link of normalized) {
      const [[milestone]] = await connection.execute(
        "SELECT id FROM milestones WHERE id = ? AND repository_id = ?",
        [link.milestoneId, projectId],
      );
      if (!milestone) {
        await connection.rollback();
        return res.status(422).json({ message: "A milestone does not belong to this project." });
      }
      if (link.sectionIds.length) {
        const placeholders = link.sectionIds.map(() => "?").join(", ");
        const [validSections] = await connection.execute(
          `SELECT id FROM paper_sections
           WHERE paper_id = ? AND id IN (${placeholders})`,
          [paper.id, ...link.sectionIds],
        );
        if (validSections.length !== link.sectionIds.length) {
          await connection.rollback();
          return res.status(422).json({ message: "A paper section does not belong to this project's paper." });
        }
      }
      await connection.execute("DELETE FROM milestone_paper_sections WHERE milestone_id = ?", [link.milestoneId]);
      if (link.sectionIds.length) {
        const values = link.sectionIds.map(() => "(?, ?)").join(", ");
        await connection.execute(
          `INSERT INTO milestone_paper_sections (milestone_id, paper_section_id) VALUES ${values}`,
          link.sectionIds.flatMap((sectionId) => [link.milestoneId, sectionId]),
        );
      }
    }
    await connection.commit();
    return res.status(200).json({ message: "Milestone paper section links saved." });
  } catch (error) {
    await connection.rollback();
    console.error("Milestone paper link update failed:", error);
    return res.status(500).json({ message: "Unable to save milestone paper section links." });
  } finally {
    connection.release();
  }
};

module.exports = {
  createPaperFromTemplate,
  getPaperSectionHistory,
  getPaperWorkspace,
  listPaperSubmissions,
  reviewPaperSubmission,
  savePaperSection,
  submitPaperForReview,
  updateMilestonePaperSections,
  updatePaperStatus,
};
