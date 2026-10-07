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
    const filters = ["u.role = 'faculty'"];
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
              fp.experience, fp.publications, fp.research_projects, fp.guidance_areas
       FROM users u
       LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
       WHERE ${filters.join(" AND ")}
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
          COUNT(DISTINCT CASE WHEN m.status = 'COMPLETED' THEN m.id END) AS completed_milestones,
          COUNT(DISTINCT CASE WHEN m.deadline < UTC_TIMESTAMP() AND m.status <> 'COMPLETED' THEN m.id END) AS overdue_milestones
       FROM mentor_requests mr
       LEFT JOIN milestones m ON m.repository_id = mr.repository_id
       WHERE mr.faculty_id = ? AND mr.status = 'ACCEPTED'`,
      [req.user.id],
    );

    const [projects] = await db.promise().execute(
      `SELECT r.id, r.name, r.domain, r.status, r.research_type, r.created_at,
              owner.name AS owner_name,
              COUNT(DISTINCT rm.user_id) AS member_count,
              COALESCE(ROUND(AVG(m.completion_percentage), 1), 0) AS completion_percentage
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

    return res.status(200).json({ summary, projects });
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
