const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMemberIds,
  parsePositiveId,
} = require("../services/repositoryAccess");

const createMentorRequest = async (req, res) => {
  const repositoryId = parsePositiveId(req.body.repositoryId);
  const facultyId = parsePositiveId(req.body.facultyId);
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!repositoryId || !facultyId || message.length > 2000) {
    return res.status(422).json({ message: "Please provide a valid project, professor, and request message." });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [[project]] = await connection.execute(
      `SELECT r.id, r.name, r.owner_id, r.research_type, owner.name AS owner_name
       FROM repositories r
       INNER JOIN users owner ON owner.id = r.owner_id
       WHERE r.id = ? AND r.owner_id = ?
       FOR UPDATE`,
      [repositoryId, req.user.id],
    );
    if (!project) {
      await connection.rollback();
      return res.status(404).json({
        message: "Only the project owner can request faculty guidance for this project.",
      });
    }

    if (project.research_type === "group") {
      const [[groupState]] = await connection.execute(
        `SELECT
           (SELECT COUNT(*) FROM repository_invitations
            WHERE repository_id = ? AND response_status = 'pending'
              AND expires_at > UTC_TIMESTAMP()) AS pending_invitations,
           (SELECT COUNT(*) FROM repository_members
            WHERE repository_id = ? AND member_role = 'member') AS accepted_members`,
        [repositoryId, repositoryId],
      );
      if (Number(groupState.pending_invitations) > 0 || Number(groupState.accepted_members) === 0) {
        await connection.rollback();
        return res.status(409).json({
          message: "Finalize the group first: at least one invitee must accept and all active invitations must be resolved before requesting faculty guidance.",
        });
      }
    }

    const [[faculty]] = await connection.execute(
      `SELECT id, name
       FROM users
       WHERE id = ? AND role = 'faculty' AND is_active = TRUE
         AND email_verified = TRUE
       FOR UPDATE`,
      [facultyId],
    );
    if (!faculty) {
      await connection.rollback();
      return res.status(404).json({ message: "Active faculty account not found." });
    }

    const [[existing]] = await connection.execute(
      `SELECT id, faculty_id, status FROM mentor_requests
       WHERE repository_id = ? AND status IN ('PENDING', 'ACCEPTED')
       LIMIT 1
       FOR UPDATE`,
      [repositoryId],
    );
    if (existing) {
      await connection.rollback();
      return res.status(409).json({
        message: existing.status === "ACCEPTED"
          ? "This project already has an active faculty mentor."
          : "A guidance request is already pending for this project.",
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO mentor_requests (repository_id, faculty_id, requested_by, message)
       VALUES (?, ?, ?, ?)`,
      [repositoryId, facultyId, req.user.id, message || null],
    );

    await createNotifications([facultyId], {
      type: "MENTOR_REQUEST",
      title: "New guidance request",
      message: `${project.owner_name} requested your guidance for "${project.name}".`,
      linkUrl: "/dashboard/faculty",
    }, connection);
    await connection.commit();

    return res.status(201).json({
      message: "Guidance request sent.",
      mentorRequestId: result.insertId,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Mentor request creation failed:", error);
    return res.status(500).json({ message: "Unable to send guidance request." });
  } finally {
    if (connection) connection.release();
  }
};

const getMentorRequests = async (req, res) => {
  try {
    let requests;
    if (req.user.role === "faculty") {
      [requests] = await db.promise().execute(
        `SELECT mr.id, mr.status, mr.message, mr.rejection_reason,
                mr.created_at, mr.responded_at,
                r.id AS repository_id, r.name AS repository_name,
                r.description AS research_topic, r.domain,
                (SELECT GROUP_CONCAT(DISTINCT student.name ORDER BY student.name SEPARATOR '\n')
                 FROM repository_members rm
                 INNER JOIN users student ON student.id = rm.user_id AND student.role = 'student'
                 WHERE rm.repository_id = r.id) AS student_names,
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
        `SELECT mr.id, mr.status, mr.message, mr.rejection_reason,
                mr.created_at, mr.responded_at,
                r.id AS repository_id, r.name AS repository_name, r.domain,
                f.id AS faculty_id, f.name AS faculty_name, fp.designation
         FROM repository_members rm
         INNER JOIN mentor_requests mr ON mr.repository_id = rm.repository_id
         INNER JOIN repositories r ON r.id = mr.repository_id
         INNER JOIN users f ON f.id = mr.faculty_id
         LEFT JOIN faculty_profiles fp ON fp.user_id = f.id
         WHERE rm.user_id = ? AND r.owner_id = ?
         ORDER BY mr.created_at DESC`,
        [req.user.id, req.user.id],
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
  const rejectionReason = typeof req.body.rejectionReason === "string"
    ? req.body.rejectionReason.trim()
    : "";
  if (!requestId || !["ACCEPTED", "REJECTED", "CANCELLED"].includes(status)) {
    return res.status(422).json({ message: "Please provide a valid request status." });
  }
  if (status === "REJECTED" && (!rejectionReason || rejectionReason.length > 2000)) {
    return res.status(422).json({
      message: "Please provide a rejection reason (up to 2,000 characters).",
    });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [[requestReference]] = await connection.execute(
      "SELECT repository_id FROM mentor_requests WHERE id = ?",
      [requestId],
    );
    if (!requestReference) {
      await connection.rollback();
      return res.status(404).json({ message: "Guidance request not found." });
    }
    await connection.execute(
      "SELECT id FROM repositories WHERE id = ? FOR UPDATE",
      [requestReference.repository_id],
    );
    const [rows] = await connection.execute(
      `SELECT mr.id, mr.repository_id, mr.faculty_id, mr.requested_by, mr.status,
              r.name AS repository_name, r.owner_id,
              faculty.name AS faculty_name, requester.name AS requester_name
       FROM mentor_requests mr
       INNER JOIN repositories r ON r.id = mr.repository_id
       INNER JOIN users faculty ON faculty.id = mr.faculty_id
       INNER JOIN users requester ON requester.id = mr.requested_by
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
      `UPDATE mentor_requests
       SET status = ?, rejection_reason = ?, responded_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [status, status === "REJECTED" ? rejectionReason : null, requestId],
    );

    const notificationRecipients = status === "REJECTED"
      ? [request.owner_id]
      : status === "CANCELLED"
        ? [request.faculty_id]
        : await getRepositoryMemberIds(request.repository_id, connection);
    await createNotifications(notificationRecipients, {
      type: "MENTOR_REQUEST_UPDATED",
      title: status === "ACCEPTED"
        ? "Faculty guidance accepted"
        : status === "REJECTED"
          ? "Faculty guidance request rejected"
          : "Guidance request cancelled",
      message: status === "REJECTED"
        ? `${request.faculty_name} rejected your guidance request for "${request.repository_name}".${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`
        : status === "CANCELLED"
          ? `${request.requester_name} cancelled the guidance request for "${request.repository_name}".`
          : `${request.faculty_name} accepted your guidance request for "${request.repository_name}".`,
      linkUrl: `/repository/${request.repository_id}`,
    }, connection);
    await connection.commit();

    return res.status(200).json({ message: `Guidance request ${status.toLowerCase()}.` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Mentor request update failed:", error);
    return res.status(500).json({ message: "Unable to update guidance request." });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createMentorRequest,
  getMentorRequests,
  updateMentorRequest,
};
