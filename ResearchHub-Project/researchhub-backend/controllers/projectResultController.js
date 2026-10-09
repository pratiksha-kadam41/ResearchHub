const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const readResultRows = async (connection, repositoryId, lock = false) => {
  const [rows] = await connection.execute(
    `SELECT m.id AS milestone_id, m.order_no AS milestone_number, m.title AS milestone_title,
            m.marks AS maximum_marks, m.status AS milestone_status,
            s.id AS submission_id, s.status AS submission_status,
            sr.decision, sr.marks_awarded
     FROM milestones m
     LEFT JOIN milestone_submissions s
       ON s.id = (
         SELECT latest.id FROM milestone_submissions latest
         WHERE latest.milestone_id = m.id
         ORDER BY latest.version_number DESC, latest.id DESC LIMIT 1
       )
     LEFT JOIN submission_reviews sr
       ON sr.id = (
         SELECT latest_review.id FROM submission_reviews latest_review
         WHERE latest_review.submission_id = s.id
         ORDER BY latest_review.reviewed_at DESC, latest_review.id DESC LIMIT 1
       )
     WHERE m.repository_id = ?
     ORDER BY m.order_no ASC, m.id ASC${lock ? " FOR UPDATE" : ""}`,
    [repositoryId],
  );
  return rows;
};

const getProjectResults = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "A valid repository ID is required." });

  try {
    const studentMembership = req.user.role === "student"
      ? await getRepositoryMembership(repositoryId, req.user.id)
      : null;
    const facultyMentorship = req.user.role === "faculty"
      ? await getRepositoryMentorship(repositoryId, req.user.id)
      : null;
    if (!studentMembership && !facultyMentorship) {
      return res.status(403).json({ message: "You do not have access to these project results." });
    }

    const [[publication]] = await db.promise().execute(
      `SELECT published_at, results_snapshot
       FROM project_result_publications
       WHERE repository_id = ?`,
      [repositoryId],
    );

    if (publication) {
      const snapshot = typeof publication.results_snapshot === "string"
        ? JSON.parse(publication.results_snapshot)
        : publication.results_snapshot;
      return res.status(200).json({
        published: true,
        publishedAt: publication.published_at,
        results: snapshot,
      });
    }

    if (req.user.role === "student") {
      return res.status(200).json({ published: false, results: null });
    }

    const [rows] = await db.promise().execute(
      `SELECT r.name AS group_name,
              GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS member_names
       FROM repositories r
       LEFT JOIN repository_members rm ON rm.repository_id = r.id
       LEFT JOIN users u ON u.id = rm.user_id AND u.role = 'student'
       WHERE r.id = ?
       GROUP BY r.id`,
      [repositoryId],
    );
    const milestones = await readResultRows(db.promise(), repositoryId);
    const ready = milestones.length > 0 && milestones.every((milestone) =>
      ["APPROVED", "COMPLETED"].includes(String(milestone.milestone_status).toUpperCase()) &&
      String(milestone.submission_status).toUpperCase() === "APPROVED" &&
      String(milestone.decision).toUpperCase() === "APPROVED" &&
      milestone.marks_awarded !== null,
    );
    return res.status(200).json({
      published: false,
      ready,
      groupName: rows[0]?.group_name || "",
      memberNames: rows[0]?.member_names || "",
      results: milestones.map((milestone) => ({
        milestoneId: milestone.milestone_id,
        milestoneNumber: milestone.milestone_number,
        milestoneTitle: milestone.milestone_title,
        maximumMarks: milestone.maximum_marks,
        awardedMarks: milestone.marks_awarded,
      })),
    });
  } catch (error) {
    console.error("Project results lookup failed:", error);
    return res.status(500).json({ message: "Unable to load project results." });
  }
};

const publishProjectResults = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "A valid repository ID is required." });
  if (req.user.role !== "faculty") {
    return res.status(403).json({ message: "Only the assigned faculty can publish project results." });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const mentorship = await getRepositoryMentorship(repositoryId, req.user.id, connection);
    if (!mentorship) {
      await connection.rollback();
      return res.status(403).json({ message: "Only the assigned faculty can publish project results." });
    }

    await connection.execute("SELECT id FROM repositories WHERE id = ? FOR UPDATE", [repositoryId]);
    const [existing] = await connection.execute(
      "SELECT repository_id FROM project_result_publications WHERE repository_id = ?",
      [repositoryId],
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Project results have already been published." });
    }

    const milestones = await readResultRows(connection, repositoryId, true);
    const ready = milestones.length > 0 && milestones.every((milestone) =>
      ["APPROVED", "COMPLETED"].includes(String(milestone.milestone_status).toUpperCase()) &&
      String(milestone.submission_status).toUpperCase() === "APPROVED" &&
      String(milestone.decision).toUpperCase() === "APPROVED" &&
      milestone.marks_awarded !== null,
    );
    if (!ready) {
      await connection.rollback();
      return res.status(409).json({
        message: "Complete and mark every milestone before publishing project results.",
      });
    }

    const [[project]] = await connection.execute(
      `SELECT r.name AS group_name,
              GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS member_names
       FROM repositories r
       LEFT JOIN repository_members rm ON rm.repository_id = r.id
       LEFT JOIN users u ON u.id = rm.user_id AND u.role = 'student'
       WHERE r.id = ?
       GROUP BY r.id`,
      [repositoryId],
    );
    const resultsSnapshot = milestones.map((milestone) => ({
      milestoneId: milestone.milestone_id,
      milestoneNumber: milestone.milestone_number,
      milestoneTitle: milestone.milestone_title,
      maximumMarks: milestone.maximum_marks,
      awardedMarks: milestone.marks_awarded,
      groupName: project.group_name,
      memberNames: project.member_names || "",
    }));
    await connection.execute(
      `INSERT INTO project_result_publications (repository_id, published_by, results_snapshot)
       VALUES (?, ?, ?)`,
      [repositoryId, req.user.id, JSON.stringify(resultsSnapshot)],
    );

    const [students] = await connection.execute(
      `SELECT rm.user_id
       FROM repository_members rm
       INNER JOIN users u ON u.id = rm.user_id
       WHERE rm.repository_id = ? AND u.role = 'student'`,
      [repositoryId],
    );
    await createNotifications(
      students.map((student) => student.user_id),
      {
        type: "RESULT_PUBLISHED",
        title: "Project results published",
        message: `Results for ${project.group_name} are now available.`,
        linkUrl: `/repository/${repositoryId}?tab=results`,
      },
      connection,
    );
    await connection.commit();
    return res.status(200).json({ published: true, results: resultsSnapshot });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Project results publication failed:", error);
    return res.status(500).json({ message: "Unable to publish project results." });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getProjectResults, publishProjectResults };
