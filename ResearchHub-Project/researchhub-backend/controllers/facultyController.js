const db = require("../config/db");

const PROFILE_FIELDS = [
  "designation",
  "research_areas",
  "expertise",
  "research_interests",
  "experience",
  "publications",
  "research_projects",
  "guidance_areas",
];

const profileValuesFrom = (body) => {
  const values = {};
  for (const field of PROFILE_FIELDS) {
    const value = body[field];
    if (value !== undefined && typeof value !== "string") {
      return { error: `${field} must be text.` };
    }
    values[field] = typeof value === "string" ? value.trim() || null : null;
    if (values[field]?.length > 10000) {
      return { error: `${field} is too long.` };
    }
  }
  return { values };
};

const getOwnFacultyProfile = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(
      `SELECT u.id AS user_id, u.name, u.email, u.institution, u.created_at,
              fp.designation, fp.research_areas, fp.expertise, fp.research_interests,
              fp.experience, fp.publications, fp.research_projects, fp.guidance_areas,
              fp.updated_at
       FROM users u
       LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
       WHERE u.id = ? AND u.role = 'faculty'`,
      [req.user.id],
    );

    if (!rows[0]) {
      return res.status(404).json({ message: "Faculty account not found." });
    }

    return res.status(200).json({ profile: rows[0] });
  } catch (error) {
    console.error("Faculty profile lookup failed:", error);
    return res.status(500).json({ message: "Unable to load faculty profile." });
  }
};

const updateFacultyProfile = async (req, res) => {
  const { values, error } = profileValuesFrom(req.body || {});
  if (error) return res.status(422).json({ message: error });

  try {
    await db.promise().execute(
      `INSERT INTO faculty_profiles
        (user_id, designation, research_areas, expertise, research_interests,
         experience, publications, research_projects, guidance_areas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         designation = VALUES(designation),
         research_areas = VALUES(research_areas),
         expertise = VALUES(expertise),
         research_interests = VALUES(research_interests),
         experience = VALUES(experience),
         publications = VALUES(publications),
         research_projects = VALUES(research_projects),
         guidance_areas = VALUES(guidance_areas)`,
      [req.user.id, ...PROFILE_FIELDS.map((field) => values[field])],
    );

    return res.status(200).json({ message: "Faculty profile saved." });
  } catch (saveError) {
    console.error("Faculty profile update failed:", saveError);
    return res.status(500).json({ message: "Unable to save faculty profile." });
  }
};

const listFaculty = async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length > 100) {
    return res.status(422).json({ message: "Search text is too long." });
  }

  try {
    const filters = [
      "u.role = 'faculty'",
      "u.is_active = TRUE",
      "u.email_verified = TRUE",
    ];
    const parameters = [];
    if (search) {
      const pattern = `%${search}%`;
      filters.push(
        "(u.name LIKE ? OR u.institution LIKE ? OR fp.research_areas LIKE ? OR fp.expertise LIKE ? OR fp.research_interests LIKE ? OR fp.guidance_areas LIKE ?)",
      );
      parameters.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const [faculty] = await db.promise().execute(
      `SELECT u.id, u.name, u.institution,
              fp.designation, fp.research_areas, fp.expertise, fp.research_interests,
              fp.experience, fp.publications, fp.research_projects, fp.guidance_areas,
              COUNT(DISTINCT CASE WHEN mr.status = 'ACCEPTED' THEN r.id END) AS guided_project_count,
              COUNT(DISTINCT CASE
                WHEN mr.status = 'ACCEPTED' AND r.privacy <> 'public' THEN r.id
              END) AS private_guided_project_count,
              GROUP_CONCAT(
                DISTINCT CASE
                  WHEN mr.status = 'ACCEPTED' AND r.privacy = 'public' THEN r.name
                END
                ORDER BY r.name SEPARATOR '\n'
              ) AS guided_projects
       FROM users u
       LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
       LEFT JOIN mentor_requests mr ON mr.faculty_id = u.id AND mr.status = 'ACCEPTED'
       LEFT JOIN repositories r ON r.id = mr.repository_id
       WHERE ${filters.join(" AND ")}
       GROUP BY u.id, u.name, u.institution, fp.designation, fp.research_areas,
                fp.expertise, fp.research_interests, fp.experience, fp.publications,
                fp.research_projects, fp.guidance_areas
       ORDER BY u.name ASC
       LIMIT 50`,
      parameters,
    );

    return res.status(200).json({ faculty });
  } catch (lookupError) {
    console.error("Faculty discovery failed:", lookupError);
    return res.status(500).json({ message: "Unable to find faculty members." });
  }
};

const getFacultyDashboard = async (req, res) => {
  try {
    const [[summary]] = await db.promise().execute(
      `SELECT
          COUNT(DISTINCT mr.repository_id) AS assigned_projects,
          COUNT(DISTINCT CASE WHEN m.submission_status IN ('SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW') THEN m.id END) AS pending_reviews,
          COUNT(DISTINCT CASE WHEN m.status IN ('APPROVED', 'COMPLETED') THEN m.id END) AS completed_milestones,
          COUNT(DISTINCT CASE
            WHEN m.deadline < UTC_TIMESTAMP()
              AND m.status NOT IN ('APPROVED', 'COMPLETED')
              AND NOT EXISTS (
                SELECT 1
                FROM milestone_submissions ms
                WHERE ms.milestone_id = m.id
              )
            THEN m.id
          END) AS overdue_milestones
       FROM mentor_requests mr
       LEFT JOIN milestones m ON m.repository_id = mr.repository_id
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'`,
      [req.user.id],
    );

    const [projects] = await db.promise().execute(
      `SELECT r.id, r.name, r.domain, r.status, r.research_type, r.created_at,
              owner.name AS owner_name,
              COUNT(DISTINCT rm.user_id) AS member_count,
              COUNT(DISTINCT m.id) AS milestone_count,
              COALESCE(ROUND(AVG(m.completion_percentage), 1), 0) AS completion_percentage,
              (SELECT publication.published_at
               FROM project_result_publications publication
               WHERE publication.repository_id = r.id) AS results_published_at,
              (SELECT COUNT(*)
               FROM milestones marked
               WHERE marked.repository_id = r.id
                 AND marked.status IN ('APPROVED', 'COMPLETED')
                 AND EXISTS (
                   SELECT 1
                   FROM milestone_submissions latest_submission
                   JOIN submission_reviews latest_review
                     ON latest_review.id = (
                       SELECT review.id FROM submission_reviews review
                       WHERE review.submission_id = latest_submission.id
                       ORDER BY review.reviewed_at DESC, review.id DESC LIMIT 1
                     )
                   WHERE latest_submission.id = (
                     SELECT submission.id FROM milestone_submissions submission
                     WHERE submission.milestone_id = marked.id
                     ORDER BY submission.version_number DESC, submission.id DESC LIMIT 1
                   )
                     AND latest_submission.status = 'APPROVED'
                     AND latest_review.decision = 'APPROVED'
                     AND latest_review.marks_awarded IS NOT NULL
                 )) AS marked_milestone_count
       FROM mentor_requests mr
       INNER JOIN repositories r ON r.id = mr.repository_id
       INNER JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN repository_members rm ON rm.repository_id = r.id
       LEFT JOIN milestones m ON m.repository_id = r.id
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [req.user.id],
    );
    for (const project of projects) {
       project.results_ready = Number(project.milestone_count) > 0 &&
         Number(project.milestone_count) === Number(project.marked_milestone_count);
    }

    const [pendingReviews] = await db.promise().execute(
      `SELECT s.id AS submission_id, s.submitted_at, s.is_late, s.status,
              m.id AS milestone_id, m.order_no AS milestone_number,
              m.title AS milestone_title, r.id AS repository_id,
              r.name AS project_name, submitter.id AS submitted_by,
              submitter.name AS submitted_by_name,
              GROUP_CONCAT(DISTINCT member.name ORDER BY member.name SEPARATOR ', ') AS group_members
       FROM mentor_requests mr
       JOIN repositories r ON r.id = mr.repository_id
       JOIN milestones m ON m.repository_id = r.id
       JOIN milestone_submissions s ON s.milestone_id = m.id
       JOIN users submitter ON submitter.id = s.submitted_by
       LEFT JOIN repository_members rm ON rm.repository_id = r.id
       LEFT JOIN users member ON member.id = rm.user_id
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'
         AND s.status IN ('SUBMITTED', 'UNDER_REVIEW')
         AND s.id = (
           SELECT latest.id FROM milestone_submissions latest
           WHERE latest.milestone_id = m.id
           ORDER BY latest.version_number DESC, latest.id DESC LIMIT 1
         )
       GROUP BY s.id
       ORDER BY s.submitted_at ASC
       LIMIT 50`,
      [req.user.id],
    );

    const [recentSubmissions] = await db.promise().execute(
      `SELECT s.id AS submission_id, s.submitted_at, s.is_late, s.status,
              m.order_no AS milestone_number, m.title AS milestone_title,
              r.id AS repository_id, r.name AS project_name,
              submitter.name AS submitted_by_name
       FROM mentor_requests mr
       JOIN repositories r ON r.id = mr.repository_id
       JOIN milestones m ON m.repository_id = r.id
       JOIN milestone_submissions s ON s.milestone_id = m.id
       JOIN users submitter ON submitter.id = s.submitted_by
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'
       ORDER BY s.submitted_at DESC, s.id DESC
       LIMIT 10`,
      [req.user.id],
    );

    const [recentFeedback] = await db.promise().execute(
      `SELECT sr.id AS review_id, sr.decision, sr.reviewed_at,
              m.order_no AS milestone_number, m.title AS milestone_title,
              r.id AS repository_id, r.name AS project_name,
              submitter.name AS submitted_by_name
       FROM mentor_requests mr
       JOIN repositories r ON r.id = mr.repository_id
       JOIN milestones m ON m.repository_id = r.id
       JOIN milestone_submissions s ON s.milestone_id = m.id
       JOIN submission_reviews sr ON sr.submission_id = s.id
       JOIN users submitter ON submitter.id = s.submitted_by
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'
       ORDER BY sr.reviewed_at DESC, sr.id DESC
       LIMIT 10`,
      [req.user.id],
    );

    return res.status(200).json({ summary, projects, pendingReviews, recentSubmissions, recentFeedback });
  } catch (dashboardError) {
    console.error("Faculty dashboard lookup failed:", dashboardError);
    return res.status(500).json({ message: "Unable to load faculty dashboard." });
  }
};

module.exports = {
  getFacultyDashboard,
  getOwnFacultyProfile,
  listFaculty,
  updateFacultyProfile,
};
