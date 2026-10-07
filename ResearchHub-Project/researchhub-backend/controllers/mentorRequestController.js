const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  parsePositiveId,
} = require("../services/repositoryAccess");

const createMentorRequest = async (req, res) => {
  const repositoryId = parsePositiveId(req.body.repositoryId);
  const facultyId = parsePositiveId(req.body.facultyId);
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!repositoryId || !facultyId || message.length > 2000) {
    return res.status(422).json({ message: "Please provide a valid project, professor, and request message." });
  }

  try {
    const membership = await getRepositoryMembership(repositoryId, req.user.id);
    if (!membership) {
      return res.status(404).json({ message: "Project not found or you are not a member." });
    }

    const [[faculty]] = await db.promise().execute(
      "SELECT id, name FROM users WHERE id = ? AND role = 'faculty'",
      [facultyId],
    );
    if (!faculty) return res.status(404).json({ message: "Professor not found." });

    const [[existing]] = await db.promise().execute(
      `SELECT id, status FROM mentor_requests
       WHERE repository_id = ? AND faculty_id = ?
         AND status IN ('PENDING', 'ACCEPTED')
       LIMIT 1`,
      [repositoryId, facultyId],
    );
    if (existing) {
      return res.status(409).json({
        message: existing.status === "ACCEPTED"
          ? "This professor is already assigned to the project."
          : "A guidance request to this professor is already pending.",
      });
    }

    const [result] = await db.promise().execute(
      `INSERT INTO mentor_requests (repository_id, faculty_id, requested_by, message)
       VALUES (?, ?, ?, ?)`,
      [repositoryId, facultyId, req.user.id, message || null],
    );

    await createNotifications([facultyId], {
      type: "MENTOR_REQUEST",
      title: "New guidance request",
      message: `${membership.name} has requested your research guidance.`,
      linkUrl: "/dashboard/faculty",
    });

    return res.status(201).json({
      message: "Guidance request sent.",
      mentorRequestId: result.insertId,
    });
  } catch (error) {
    console.error("Mentor request creation failed:", error);
    return res.status(500).json({ message: "Unable to send guidance request." });
  }
};

const getMentorRequests = async (req, res) => {
  try {
    let requests;
    if (req.user.role === "faculty") {
      [requests] = await db.promise().execute(
        `SELECT mr.id, mr.status, mr.message, mr.created_at, mr.responded_at,
                r.id AS repository_id, r.name AS repository_name, r.domain,
                u.id AS requester_id, u.name AS requester_name, u.email AS requester_email
         FROM mentor_requests mr
         INNER JOIN repositories r ON r.id = mr.repository_id
         INNER JOIN users u ON u.id = mr.requested_by
         WHERE mr.faculty_id = ?
         ORDER BY FIELD(mr.status, 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'), mr.created_at DESC`,
        [req.user.id],
      );
    } else {
      [requests] = await db.promise().execute(
        `SELECT mr.id, mr.status, mr.message, mr.created_at, mr.responded_at,
                r.id AS repository_id, r.name AS repository_name, r.domain,
                f.id AS faculty_id, f.name AS faculty_name, fp.designation
         FROM repository_members rm
         INNER JOIN mentor_requests mr ON mr.repository_id = rm.repository_id
         INNER JOIN repositories r ON r.id = mr.repository_id
         INNER JOIN users f ON f.id = mr.faculty_id
         LEFT JOIN faculty_profiles fp ON fp.user_id = f.id
         WHERE rm.user_id = ?
         ORDER BY mr.created_at DESC`,
        [req.user.id],
      );
    }

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Mentor request listing failed:", error);
    return res.status(500).json({ message: "Unable to load guidance requests." });
  }
};

const updateMentorRequest = async (req, res) => {
  const requestId = parsePositiveId(req.params.requestId);
  const status = typeof req.body.status === "string" ? req.body.status.toUpperCase() : "";
  if (!requestId || !["ACCEPTED", "REJECTED", "CANCELLED"].includes(status)) {
    return res.status(422).json({ message: "Please provide a valid request status." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT mr.id, mr.repository_id, mr.faculty_id, mr.requested_by, mr.status,
              r.name AS repository_name
       FROM mentor_requests mr
       INNER JOIN repositories r ON r.id = mr.repository_id
       WHERE mr.id = ? FOR UPDATE`,
      [requestId],
    );
    const request = rows[0];
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ message: "Guidance request not found." });
    }
    if (request.status !== "PENDING") {
      await connection.rollback();
      return res.status(409).json({ message: "This guidance request has already been resolved." });
    }

    if (status === "CANCELLED") {
      if (req.user.role !== "student" || request.requested_by !== req.user.id) {
        await connection.rollback();
        return res.status(403).json({ message: "Only the requesting student can cancel this request." });
      }
    } else if (req.user.role !== "faculty" || request.faculty_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: "Only the requested professor can respond." });
    }

    if (status === "ACCEPTED") {
      const [acceptedRequests] = await connection.execute(
        `SELECT id FROM mentor_requests
         WHERE repository_id = ? AND status = 'ACCEPTED' AND id <> ?
         FOR UPDATE`,
        [request.repository_id, request.id],
      );
      if (acceptedRequests.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          message: "This project already has an assigned professor.",
        });
      }
    }

    await connection.execute(
      "UPDATE mentor_requests SET status = ?, responded_at = UTC_TIMESTAMP() WHERE id = ?",
      [status, requestId],
    );

    const memberIds = await getRepositoryMemberIds(request.repository_id, connection);
    await createNotifications(memberIds, {
      type: "MENTOR_REQUEST_UPDATED",
      title: "Guidance request updated",
      message: `${request.repository_name}: your guidance request was ${status.toLowerCase()}.`,
      linkUrl: `/repository/${request.repository_id}`,
    }, connection);
    await connection.commit();

    return res.status(200).json({ message: `Guidance request ${status.toLowerCase()}.` });
  } catch (error) {
    await connection.rollback();
    console.error("Mentor request update failed:", error);
    return res.status(500).json({ message: "Unable to update guidance request." });
  } finally {
    connection.release();
  }
};

module.exports = {
  createMentorRequest,
  getMentorRequests,
  updateMentorRequest,
};
