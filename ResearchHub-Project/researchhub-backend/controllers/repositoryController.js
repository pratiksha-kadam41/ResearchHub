const { createHash, randomBytes } = require("node:crypto");
const nodemailer = require("nodemailer");
const db = require("../config/db");

// The owner plus 3–4 accepted invitations forms the intended 4–5 person group.
const MIN_GROUP_INVITATIONS = 3;
const MAX_GROUP_INVITATIONS = 4;
const INVITATION_VALIDITY_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getMailTransport = () => {
  const {
    SMTP_USER,
    SMTP_PASS,
    SMTP_HOST = "smtp.gmail.com",
    SMTP_PORT = "587",
    SMTP_FROM = SMTP_USER,
  } = process.env;

  if (!SMTP_USER && !SMTP_PASS) {
    return null;
  }

  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      "Gmail setup is incomplete. Set SMTP_USER to your Gmail address and SMTP_PASS to a new Google App Password in the backend .env file.",
    );
  }

  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const createInvitationToken = () => randomBytes(32).toString("hex");
const hashInvitationToken = (token) =>
  createHash("sha256").update(token).digest("hex");
const getInvitationUrl = (token) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  return `${frontendUrl}/invitations/accept/${token}`;
};
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const isStudent = (req, res) => {
  if (req.user.role === "student") {
    return true;
  }

  res.status(403).json({ message: "Only student accounts can manage research repositories." });
  return false;
};

const sendInvitationEmail = async (transporter, invitation) => {
  const invitationUrl = getInvitationUrl(invitation.token);
  const inviterName = escapeHtml(invitation.inviterName);
  const repositoryName = escapeHtml(invitation.repositoryName);
  const email = escapeHtml(invitation.email);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: invitation.email,
    subject: `Invitation to join ${invitation.repositoryName} on ResearchHub`,
    text: `${invitation.inviterName} invited you to join "${invitation.repositoryName}" on ResearchHub.\n\nAccept the invitation within ${INVITATION_VALIDITY_DAYS} days: ${invitationUrl}\n\nSign in or create a student account using ${invitation.email}, then open this link again to accept.`,
    html: `<p>${inviterName} invited you to join <strong>${repositoryName}</strong> on ResearchHub.</p><p>This invitation expires in ${INVITATION_VALIDITY_DAYS} days.</p><p><a href="${invitationUrl}">Accept the invitation</a></p><p>Sign in or create a student account using ${email}, then open this link again to accept.</p>`,
  });
};

const createRepository = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const { name, description, domain, researchType, privacy, memberEmails = [] } =
    req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof domain !== "string" ||
    !domain.trim() ||
    !["individual", "group"].includes(researchType) ||
    !["private", "shared", "public"].includes(privacy)
  ) {
    return res.status(400).json({ message: "Please provide valid repository details." });
  }

  if (!Array.isArray(memberEmails)) {
    return res.status(400).json({ message: "Group member emails must be a list." });
  }

  const normalizedEmails = memberEmails.map((email) =>
    typeof email === "string" ? email.trim().toLowerCase() : "",
  );
  const [[owner]] = await db
    .promise()
    .execute(
      "SELECT id, name, email FROM users WHERE id = ? AND role = 'student'",
      [req.user.id],
    );

  if (!owner) {
    return res.status(404).json({ message: "Student account not found." });
  }

  if (
    normalizedEmails.some((email) => !EMAIL_PATTERN.test(email)) ||
    new Set(normalizedEmails).size !== normalizedEmails.length ||
    normalizedEmails.includes(owner.email.toLowerCase())
  ) {
    return res.status(400).json({
      message: "Enter unique, valid email addresses that do not include your own.",
    });
  }

  if (
    (researchType === "group" &&
      (normalizedEmails.length < MIN_GROUP_INVITATIONS ||
        normalizedEmails.length > MAX_GROUP_INVITATIONS)) ||
    (researchType === "individual" && normalizedEmails.length > 0)
  ) {
    return res.status(400).json({
      message:
        researchType === "group"
          ? `A group repository requires ${MIN_GROUP_INVITATIONS} to ${MAX_GROUP_INVITATIONS} member email addresses, creating a 4–5 person group including the owner.`
          : "Individual repositories cannot include group invitations.",
    });
  }

  let transporter;
  let emailConfigurationError = null;
  if (researchType === "group") {
    try {
      transporter = getMailTransport();
      if (transporter) {
        await transporter.verify();
      }
    } catch (error) {
      console.error("Repository invitation email setup failed:", error);
      emailConfigurationError = error.message;
      transporter = null;
    }

    if (!transporter && !emailConfigurationError) {
      emailConfigurationError =
        "Automatic email is not configured. Share the secure invitation links manually, or configure SMTP to send emails automatically.";
    }
  }

  const connection = await db.promise().getConnection();
  let repositoryId;
  const invitations = normalizedEmails.map((email) => ({
    email,
    token: createInvitationToken(),
  }));

  try {
    await connection.beginTransaction();

    const [repositoryResult] = await connection.execute(
      `INSERT INTO repositories
        (name, description, domain, research_type, privacy, owner_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description.trim(),
        domain.trim(),
        researchType,
        privacy,
        owner.id,
      ],
    );
    repositoryId = repositoryResult.insertId;

    await connection.execute(
      `INSERT INTO repository_members (repository_id, user_id, member_role)
       VALUES (?, ?, 'owner')`,
      [repositoryId, owner.id],
    );

    for (const invitation of invitations) {
      await connection.execute(
        `INSERT INTO repository_invitations
          (repository_id, inviter_id, email, token_hash, expires_at, delivery_status)
         VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY), 'pending')`,
        [
          repositoryId,
          owner.id,
          invitation.email,
          hashInvitationToken(invitation.token),
          INVITATION_VALIDITY_DAYS,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Repository creation failed:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message:
          "Repository collaboration tables are missing. Run database/researchhub_group_repositories.sql in MySQL and try again.",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "One or more invitees already have an invitation to this repository.",
      });
    }

    return res.status(500).json({ message: "Unable to create the repository." });
  } finally {
    connection.release();
  }

  const deliveryResults = await Promise.all(
    invitations.map(async (invitation) => {
      let deliveryStatus = transporter ? "sent" : "pending";

      if (transporter) {
        try {
          await sendInvitationEmail(transporter, {
            ...invitation,
            repositoryName: name.trim(),
            inviterName: owner.name,
          });
        } catch (error) {
          deliveryStatus = "failed";
          emailConfigurationError =
            "One or more emails could not be delivered. Generate a link below or check the SMTP settings.";
          console.error(
            `Unable to send repository invitation to ${invitation.email}:`,
            error,
          );
        }
      }

      await db
        .promise()
        .execute(
          "UPDATE repository_invitations SET delivery_status = ? WHERE repository_id = ? AND email = ?",
          [deliveryStatus, repositoryId, invitation.email],
        );

      return {
        email: invitation.email,
        deliveryStatus,
        invitationUrl:
          deliveryStatus !== "sent"
            ? getInvitationUrl(invitation.token)
            : undefined,
      };
    }),
  );

  const emailDeliveryFailed = deliveryResults.some(
    (invitation) => invitation.deliveryStatus !== "sent",
  );

  return res.status(201).json({
    message: emailDeliveryFailed
      ? "Repository created. Email could not be sent; share the invitation links below with your group."
      : "Repository created and invitations sent.",
    emailDeliveryFailed,
    emailConfigurationError,
    repositoryId,
    ownerId: owner.id,
    invitations: deliveryResults,
  });
};

const getRepositories = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  try {
    const [repositories] = await db.promise().execute(
      `SELECT r.id, r.name, r.description, r.domain, r.research_type,
              r.privacy, r.status, r.owner_id, r.created_at,
              COUNT(all_members.user_id) AS member_count
       FROM repository_members my_membership
       INNER JOIN repositories r
         ON r.id = my_membership.repository_id
       INNER JOIN repository_members all_members
         ON all_members.repository_id = r.id
       WHERE my_membership.user_id = ?
       GROUP BY r.id
       ORDER BY r.created_at DESC, r.id DESC`,
      [req.user.id],
    );

    if (repositories.length === 0) {
      return res.status(200).json({ repositories: [] });
    }

    const repositoryIds = repositories.map((repository) => repository.id);
    const placeholders = repositoryIds.map(() => "?").join(", ");
    const [members] = await db.promise().execute(
      `SELECT rm.repository_id, u.id AS student_id, u.name, rm.member_role
       FROM repository_members rm
       INNER JOIN users u ON u.id = rm.user_id
       WHERE rm.repository_id IN (${placeholders}) AND u.role = 'student'
       ORDER BY rm.joined_at, u.name`,
      repositoryIds,
    );

    const membersByRepository = new Map();
    for (const member of members) {
      const repositoryMembers =
        membersByRepository.get(member.repository_id) || [];
      repositoryMembers.push({
        id: member.student_id,
        name: member.name,
        role: member.member_role,
      });
      membersByRepository.set(member.repository_id, repositoryMembers);
    }

    for (const repository of repositories) {
      repository.members = membersByRepository.get(repository.id) || [];
    }

    return res.status(200).json({ repositories });
  } catch (error) {
    console.error("Repository list failed:", error);
    return res.status(500).json({ message: "Unable to load your repositories." });
  }
};

const getRepository = async (req, res) => {
  const repositoryId = Number(req.params.repositoryId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId < 1) {
    return res.status(400).json({ message: "Invalid repository ID." });
  }

  try {
    let repositories;
    if (req.user.role === "student") {
      [repositories] = await db.promise().execute(
        `SELECT r.id, r.name, r.description, r.domain, r.research_type, r.privacy,
                r.status, r.owner_id, r.created_at
         FROM repositories r
         INNER JOIN repository_members rm ON rm.repository_id = r.id
         WHERE r.id = ? AND rm.user_id = ?`,
        [repositoryId, req.user.id],
      );
    } else if (req.user.role === "faculty") {
      [repositories] = await db.promise().execute(
        `SELECT r.id, r.name, r.description, r.domain, r.research_type, r.privacy,
                r.status, r.owner_id, r.created_at
         FROM repositories r
         INNER JOIN mentor_requests mr ON mr.repository_id = r.id
         WHERE r.id = ? AND mr.faculty_id = ? AND mr.status = 'ACCEPTED'`,
        [repositoryId, req.user.id],
      );
    } else {
      return res.status(403).json({ message: "You do not have access to this repository." });
    }

    if (repositories.length === 0) {
      return res.status(404).json({
        message: "Repository not found or you are not a member.",
      });
    }

    const [members] = await db.promise().execute(
      `SELECT u.id, u.name, u.email, rm.member_role, rm.joined_at
       FROM repository_members rm
       INNER JOIN users u ON u.id = rm.user_id
       WHERE rm.repository_id = ?
       ORDER BY rm.joined_at, u.name`,
      [repositoryId],
    );

    let invitations = [];
    if (repositories[0].owner_id === req.user.id) {
      [invitations] = await db.promise().execute(
        `SELECT id, email, delivery_status, expires_at, created_at
         FROM repository_invitations
         WHERE repository_id = ? AND accepted_at IS NULL
         ORDER BY created_at DESC`,
        [repositoryId],
      );
    }

    return res.status(200).json({
      repository: repositories[0],
      members,
      invitations,
    });
  } catch (error) {
    console.error("Repository lookup failed:", error);
    return res.status(500).json({ message: "Unable to load this repository." });
  }
};

const updateRepository = async (req, res) => {
  if (!isStudent(req, res)) return;

  const repositoryId = Number(req.params.repositoryId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId < 1) {
    return res.status(400).json({ message: "Invalid repository ID." });
  }
  const { name, description, domain, privacy, status } = req.body;
  if (
    typeof name !== "string" || !name.trim() || name.trim().length > 150 ||
    typeof description !== "string" || !description.trim() ||
    typeof domain !== "string" || !domain.trim() || domain.trim().length > 100 ||
    !["private", "shared", "public"].includes(privacy) ||
    !["ongoing", "completed", "archived"].includes(status)
  ) {
    return res.status(422).json({ message: "Please provide valid project details." });
  }

  try {
    const [result] = await db.promise().execute(
      `UPDATE repositories
       SET name = ?, description = ?, domain = ?, privacy = ?, status = ?
       WHERE id = ? AND owner_id = ?`,
      [name.trim(), description.trim(), domain.trim(), privacy, status, repositoryId, req.user.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Project not found or you are not its owner." });
    }
    return res.status(200).json({ message: "Project updated." });
  } catch (error) {
    console.error("Repository update failed:", error);
    return res.status(500).json({ message: "Unable to update project." });
  }
};

const removeRepositoryMember = async (req, res) => {
  if (!isStudent(req, res)) return;

  const repositoryId = Number(req.params.repositoryId);
  const memberId = Number(req.params.memberId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId < 1 || !Number.isSafeInteger(memberId) || memberId < 1) {
    return res.status(400).json({ message: "Invalid project member." });
  }
  try {
    const [[repository]] = await db.promise().execute(
      "SELECT owner_id FROM repositories WHERE id = ?",
      [repositoryId],
    );
    if (!repository || repository.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Only the project owner can remove members." });
    }
    if (memberId === req.user.id) {
      return res.status(409).json({ message: "The project owner cannot be removed." });
    }
    const [result] = await db.promise().execute(
      "DELETE FROM repository_members WHERE repository_id = ? AND user_id = ? AND member_role = 'member'",
      [repositoryId, memberId],
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Project member not found." });
    return res.status(200).json({ message: "Project member removed." });
  } catch (error) {
    console.error("Repository member removal failed:", error);
    return res.status(500).json({ message: "Unable to remove project member." });
  }
};

const getPublicRepositories = async (req, res) => {
  try {
    const [repositories] = await db.promise().execute(
      `SELECT r.id, r.name, r.description, r.domain, r.research_type, r.status,
              u.name AS owner_name, u.institution, r.created_at
       FROM repositories r
       INNER JOIN users u ON u.id = r.owner_id
       WHERE r.privacy = 'public'
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 100`,
    );
    return res.status(200).json({ repositories });
  } catch (error) {
    console.error("Public repository list failed:", error);
    return res.status(500).json({ message: "Unable to load public projects." });
  }
};

const acceptRepositoryInvitation = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const { token } = req.params;
  if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
    return res.status(400).json({ message: "This invitation link is invalid." });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [invitations] = await connection.execute(
      `SELECT ri.id, ri.repository_id, ri.email,
              (ri.expires_at <= UTC_TIMESTAMP()) AS expired,
              r.name AS repository_name
       FROM repository_invitations ri
       INNER JOIN repositories r ON r.id = ri.repository_id
       WHERE ri.token_hash = ? AND ri.accepted_at IS NULL
       FOR UPDATE`,
      [hashInvitationToken(token)],
    );

    if (invitations.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "This invitation is invalid or has already been accepted.",
      });
    }

    const invitation = invitations[0];
    const [[user]] = await connection.execute(
      "SELECT email FROM users WHERE id = ?",
      [req.user.id],
    );

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      await connection.rollback();
      return res.status(403).json({
        message: `Sign in with ${invitation.email} to accept this invitation.`,
        invitedEmail: invitation.email,
      });
    }

    if (invitation.expired) {
      await connection.rollback();
      return res.status(410).json({
        message: "This invitation has expired. Ask the repository owner to resend it.",
      });
    }

    await connection.execute(
      `INSERT INTO repository_members (repository_id, user_id, member_role)
       VALUES (?, ?, 'member')`,
      [invitation.repository_id, req.user.id],
    );
    await connection.execute(
      `UPDATE repository_invitations
       SET accepted_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [invitation.id],
    );
    await connection.commit();

    return res.status(200).json({
      message: `You joined ${invitation.repository_name}.`,
      repositoryId: invitation.repository_id,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Repository invitation acceptance failed:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "You are already a member of this repository.",
      });
    }

    return res.status(500).json({ message: "Unable to accept this invitation." });
  } finally {
    connection.release();
  }
};

const resendRepositoryInvitation = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const repositoryId = Number(req.params.repositoryId);
  const invitationId = Number(req.params.invitationId);
  if (
    !Number.isSafeInteger(repositoryId) ||
    repositoryId < 1 ||
    !Number.isSafeInteger(invitationId) ||
    invitationId < 1
  ) {
    return res.status(400).json({ message: "Invalid repository invitation." });
  }

  let transporter;
  try {
    transporter = getMailTransport();
    if (!transporter) {
      return res.status(503).json({
        message:
          "Email is not configured. Generate an invitation link to share manually, or add SMTP_USER and SMTP_PASS to the backend .env file.",
      });
    }
    await transporter.verify();
  } catch (error) {
    console.error("Invitation resend email setup failed:", error);
    return res.status(503).json({
      message: error.message || "Unable to connect to the email service.",
    });
  }

  try {
    const [rows] = await db.promise().execute(
      `SELECT ri.id, ri.email, r.name AS repository_name, u.name AS inviter_name
       FROM repository_invitations ri
       INNER JOIN repositories r ON r.id = ri.repository_id
       INNER JOIN users u ON u.id = ri.inviter_id
       INNER JOIN repository_members rm ON rm.repository_id = r.id
       WHERE ri.id = ? AND r.id = ? AND ri.inviter_id = ?
         AND ri.accepted_at IS NULL AND rm.user_id = ?
       LIMIT 1`,
      [invitationId, repositoryId, req.user.id, req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Invitation not found or you do not own this repository.",
      });
    }

    const token = createInvitationToken();
    await db.promise().execute(
      `UPDATE repository_invitations
       SET token_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY),
           delivery_status = 'pending'
       WHERE id = ?`,
      [hashInvitationToken(token), INVITATION_VALIDITY_DAYS, invitationId],
    );

    try {
      await sendInvitationEmail(transporter, {
        token,
        email: rows[0].email,
        repositoryName: rows[0].repository_name,
        inviterName: rows[0].inviter_name,
      });
      await db
        .promise()
        .execute(
          "UPDATE repository_invitations SET delivery_status = 'sent' WHERE id = ?",
          [invitationId],
        );
      return res.status(200).json({ message: "Invitation email sent again." });
    } catch (error) {
      await db
        .promise()
        .execute(
          "UPDATE repository_invitations SET delivery_status = 'failed' WHERE id = ?",
          [invitationId],
        );
      console.error(`Unable to resend repository invitation ${invitationId}:`, error);
      return res.status(502).json({
        message: "The invitation could not be delivered. Check SMTP settings and try again.",
      });
    }
  } catch (error) {
    console.error("Repository invitation resend failed:", error);
    return res.status(500).json({ message: "Unable to resend this invitation." });
  }
};

const generateRepositoryInvitationLink = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const repositoryId = Number(req.params.repositoryId);
  const invitationId = Number(req.params.invitationId);
  if (
    !Number.isSafeInteger(repositoryId) ||
    repositoryId < 1 ||
    !Number.isSafeInteger(invitationId) ||
    invitationId < 1
  ) {
    return res.status(400).json({ message: "Invalid repository invitation." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT ri.id, ri.email
       FROM repository_invitations ri
       INNER JOIN repositories r ON r.id = ri.repository_id
       INNER JOIN repository_members rm ON rm.repository_id = r.id
       WHERE ri.id = ? AND r.id = ? AND ri.inviter_id = ?
         AND ri.accepted_at IS NULL AND rm.user_id = ?
       FOR UPDATE`,
      [invitationId, repositoryId, req.user.id, req.user.id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Invitation not found or you do not own this repository.",
      });
    }

    const token = createInvitationToken();
    await connection.execute(
      `UPDATE repository_invitations
       SET token_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
       WHERE id = ?`,
      [hashInvitationToken(token), INVITATION_VALIDITY_DAYS, invitationId],
    );
    await connection.commit();

    return res.status(200).json({
      message: "Invitation link generated. Share it only with the invited student.",
      email: rows[0].email,
      invitationUrl: getInvitationUrl(token),
    });
  } catch (error) {
    await connection.rollback();
    console.error("Invitation link generation failed:", error);
    return res.status(500).json({ message: "Unable to generate this invitation link." });
  } finally {
    connection.release();
  }
};

const getRepositoryDocuments = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const repositoryId = Number(req.params.repositoryId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId < 1) {
    return res.status(400).json({ message: "Invalid repository ID." });
  }

  try {
    const [[membership]] = await db.promise().execute(
      "SELECT 1 FROM repository_members WHERE repository_id = ? AND user_id = ?",
      [repositoryId, req.user.id],
    );
    if (!membership) {
      return res.status(404).json({
        message: "Repository not found or you are not a member.",
      });
    }

    const [documents] = await db.promise().execute(
      `SELECT d.id, d.title, d.content, d.created_at, d.updated_at,
              d.created_by, d.updated_by, u.name AS updated_by_name
       FROM repository_documents d
       INNER JOIN users u ON u.id = d.updated_by
       WHERE d.repository_id = ?
       ORDER BY d.updated_at DESC, d.id DESC`,
      [repositoryId],
    );

    return res.status(200).json({ documents });
  } catch (error) {
    console.error("Repository documents lookup failed:", error);
    return res.status(500).json({ message: "Unable to load research notes." });
  }
};

const saveRepositoryDocument = async (req, res) => {
  if (!isStudent(req, res)) {
    return;
  }

  const repositoryId = Number(req.params.repositoryId);
  const documentId = req.params.documentId
    ? Number(req.params.documentId)
    : null;
  const { title, content } = req.body;

  if (
    !Number.isSafeInteger(repositoryId) ||
    repositoryId < 1 ||
    (documentId !== null &&
      (!Number.isSafeInteger(documentId) || documentId < 1))
  ) {
    return res.status(400).json({ message: "Invalid repository or note ID." });
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    typeof content !== "string" ||
    !content.trim() ||
    content.length > 50000
  ) {
    return res.status(400).json({
      message: "A note title (up to 150 characters) and content are required.",
    });
  }

  try {
    const [[membership]] = await db.promise().execute(
      "SELECT 1 FROM repository_members WHERE repository_id = ? AND user_id = ?",
      [repositoryId, req.user.id],
    );
    if (!membership) {
      return res.status(404).json({
        message: "Repository not found or you are not a member.",
      });
    }

    if (documentId === null) {
      const [result] = await db.promise().execute(
        `INSERT INTO repository_documents
          (repository_id, title, content, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [repositoryId, title.trim(), content.trim(), req.user.id, req.user.id],
      );

      return res.status(201).json({
        message: "Shared research note created.",
        documentId: result.insertId,
      });
    }

    const [result] = await db.promise().execute(
      `UPDATE repository_documents
       SET title = ?, content = ?, updated_by = ?
       WHERE id = ? AND repository_id = ?`,
      [title.trim(), content.trim(), req.user.id, documentId, repositoryId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Research note not found." });
    }

    return res.status(200).json({ message: "Shared research note updated." });
  } catch (error) {
    console.error("Repository document save failed:", error);
    return res.status(500).json({ message: "Unable to save this research note." });
  }
};

module.exports = {
  acceptRepositoryInvitation,
  createRepository,
  getRepositoryDocuments,
  getRepositories,
  getRepository,
  getPublicRepositories,
  generateRepositoryInvitationLink,
  removeRepositoryMember,
  resendRepositoryInvitation,
  saveRepositoryDocument,
  updateRepository,
};
