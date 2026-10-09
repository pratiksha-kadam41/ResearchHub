const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } = require("node:crypto");
const { getJwtSecret } = require("../config/security");
const { getMailTransport } = require("../utils/mailer");

const ROLES = ["student", "faculty"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_VERIFICATION_VALIDITY_MINUTES = 10;
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const normaliseText = (value) =>
  typeof value === "string" ? value.trim() : "";

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const hashVerificationCode = (email, code) =>
  createHmac("sha256", getJwtSecret())
    .update(`${email}:${code}`)
    .digest("hex");

const sendVerificationEmail = async (user, code) => {
  const transporter = getMailTransport();
  if (!transporter) return false;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: "Your ResearchHub email verification code",
    text: `Hello ${user.name},\n\nYour ResearchHub email verification code is ${code}.\n\nIt expires in ${EMAIL_VERIFICATION_VALIDITY_MINUTES} minutes. If you did not create this account, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your ResearchHub email verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in ${EMAIL_VERIFICATION_VALIDITY_MINUTES} minutes. If you did not create this account, you can ignore this email.</p>`,
  });
  return true;
};

// =====================================================
// REGISTER USER
// =====================================================

const registerUser = async (req, res) => {
  const { name, email, password, role, institution, course } = req.body;
  const normalizedName = normaliseText(name);
  const normalizedEmail = normaliseText(email).toLowerCase();
  const normalizedInstitution = normaliseText(institution);
  const normalizedCourse = normaliseText(course);

  // 1. Check required fields
  if (!normalizedName || !normalizedEmail || !password || !role || !normalizedInstitution) {
    return res.status(400).json({
      message: "Please fill all required fields",
    });
  }

  if (
    normalizedName.length > 100 ||
    normalizedInstitution.length > 150 ||
    normalizedEmail.length > 150 ||
    !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    return res.status(422).json({ message: "Please provide valid account details." });
  }

  if (!ROLES.includes(role)) {
    return res.status(422).json({
      message: "Role must be either student or faculty.",
    });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(422).json({
      message: "Password must be between 8 and 128 characters.",
    });
  }

  // 2. Course is required only for students
  if (role === "student" && !normalizedCourse) {
    return res.status(400).json({
      message: "Course is required for students",
    });
  }

  if (normalizedCourse.length > 100) {
    return res.status(422).json({ message: "Course is too long." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = String(randomInt(100000, 1000000));
    const userCourse = role === "student" ? normalizedCourse : null;
    const [result] = await db.promise().execute(
      `INSERT INTO users
        (name, email, password, role, institution, course, email_verified,
         is_active, email_verification_token_hash, email_verification_expires_at,
         email_verification_attempts)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE, ?,
               DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), 0)`,
      [
        normalizedName,
        normalizedEmail,
        hashedPassword,
        role,
        normalizedInstitution,
        userCourse,
        hashVerificationCode(normalizedEmail, verificationCode),
        EMAIL_VERIFICATION_VALIDITY_MINUTES,
      ],
    );

    let verificationEmailSent = false;
    try {
      verificationEmailSent = await sendVerificationEmail(
        { name: normalizedName, email: normalizedEmail },
        verificationCode,
      );
    } catch (emailError) {
      console.error("Registration verification email failed:", emailError);
    }

    return res.status(202).json({
      message: verificationEmailSent
        ? `Your account is pending email verification. Enter the six-digit code sent to your email within ${EMAIL_VERIFICATION_VALIDITY_MINUTES} minutes to complete registration.`
        : "Your account is pending email verification. We could not send a code yet; request one from this screen to complete registration.",
      userId: result.insertId,
      verificationEmailSent,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Registration failed:", error);
    return res.status(500).json({ message: "Unable to create account." });
  }
};

// =====================================================
// LOGIN USER
// =====================================================

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normaliseText(email).toLowerCase();

  // 1. Check required fields
  if (!normalizedEmail || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  // 2. Find user by email
  const sql = `
    SELECT *
    FROM users
    WHERE email = ?
  `;

  db.query(sql, [normalizedEmail], async (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    // 3. User does not exist
    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = results[0];

    // 4. Compare entered password with hashed password
    let passwordMatch;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (compareError) {
      console.error("Password comparison failed:", compareError);
      return res.status(500).json({ message: "Unable to sign in" });
    }

    // 5. Password is incorrect
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        code: "ACCOUNT_INACTIVE",
        message: "This account is inactive. Contact ResearchHub support for help.",
      });
    }
    if (!user.email_verified) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
        message: "Verify your email address before signing in.",
      });
    }

    // 6. Create JWT token
    let token;
    try {
      token = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        getJwtSecret(),
        { expiresIn: "1d" },
      );
    } catch (configurationError) {
      console.error("Authentication configuration error:", configurationError.message);
      return res.status(500).json({
        message: "Authentication is not configured on this server.",
      });
    }

    // 7. Send successful login response
    return res.status(200).json({
      message: "Login successful",

      token: token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        course: user.course,
      },
    });
  });
};

const verifyEmail = async (req, res) => {
  const email = normaliseText(req.body.email).toLowerCase();
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(422).json({ message: "Enter a valid email address and six-digit verification code." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.execute(
      `SELECT id, email_verification_token_hash, email_verification_attempts,
              (email_verification_expires_at <= UTC_TIMESTAMP()) AS expired
       FROM users
       WHERE email = ? AND email_verified = FALSE AND is_active = TRUE
       FOR UPDATE`,
      [email],
    );
    if (!user || !user.email_verification_token_hash) {
      await connection.rollback();
      return res.status(400).json({ message: "No active verification code was found. Request a new code." });
    }
    if (user.email_verification_attempts >= 5) {
      await connection.rollback();
      return res.status(429).json({ message: "Too many incorrect codes. Request a new verification code." });
    }
    if (user.expired) {
      await connection.rollback();
      return res.status(400).json({ message: "This verification code has expired. Request a new code." });
    }

    const expectedHash = Buffer.from(user.email_verification_token_hash, "hex");
    const suppliedHash = Buffer.from(hashVerificationCode(email, code), "hex");
    if (
      expectedHash.length !== suppliedHash.length ||
      !timingSafeEqual(expectedHash, suppliedHash)
    ) {
      const attempts = user.email_verification_attempts + 1;
      await connection.execute(
        "UPDATE users SET email_verification_attempts = ? WHERE id = ?",
        [attempts, user.id],
      );
      await connection.commit();
      return res.status(attempts >= 5 ? 429 : 400).json({
        message: attempts >= 5
          ? "Too many incorrect codes. Request a new verification code."
          : `That code is incorrect. ${5 - attempts} attempt${5 - attempts === 1 ? "" : "s"} remaining.`,
      });
    }

    await connection.execute(
      `UPDATE users
       SET email_verified = TRUE,
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL,
           email_verification_attempts = 0
       WHERE id = ?`,
      [user.id],
    );
    await connection.commit();
    return res.status(200).json({ message: "Email verified. Registration is complete; you can now sign in." });
  } catch (error) {
    await connection.rollback();
    console.error("Email verification failed:", error);
    return res.status(500).json({ message: "Unable to verify your email address." });
  } finally {
    connection.release();
  }
};

const resendEmailVerification = async (req, res) => {
  const email = normaliseText(req.body.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(422).json({ message: "Please provide a valid email address." });
  }

  try {
    const [[user]] = await db.promise().execute(
      `SELECT id, name, email
       FROM users
       WHERE email = ? AND email_verified = FALSE AND is_active = TRUE`,
      [email],
    );
    if (!user) {
      return res.status(202).json({
        message: `If this active account needs verification, a six-digit code has been sent. It expires in ${EMAIL_VERIFICATION_VALIDITY_MINUTES} minutes.`,
      });
    }

    const code = String(randomInt(100000, 1000000));
    await db.promise().execute(
      `UPDATE users
       SET email_verification_token_hash = ?,
           email_verification_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE),
           email_verification_attempts = 0
       WHERE id = ? AND email_verified = FALSE AND is_active = TRUE`,
      [hashVerificationCode(email, code), EMAIL_VERIFICATION_VALIDITY_MINUTES, user.id],
    );
    const emailSent = await sendVerificationEmail(user, code);
    if (!emailSent) {
      return res.status(503).json({
        message: "Verification email is not configured. Set SMTP_USER and SMTP_PASS on the server, then try again.",
      });
    }
    return res.status(202).json({
      message: `If this active account needs verification, a six-digit code has been sent. It expires in ${EMAIL_VERIFICATION_VALIDITY_MINUTES} minutes.`,
    });
  } catch (error) {
    console.error("Verification email resend failed:", error);
    return res.status(503).json({
      message: "Unable to send a verification email. Check the email configuration and try again.",
    });
  }
};

const requestPasswordReset = async (req, res) => {
  const email = normaliseText(req.body.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(422).json({ message: "Please provide a valid email address." });
  }

  try {
    const [[user]] = await db.promise().execute(
      "SELECT id, name, email FROM users WHERE email = ?",
      [email],
    );
    // Deliberately use the same response so this endpoint cannot enumerate accounts.
    if (!user) {
      return res.status(202).json({ message: "If that account exists, a reset link has been sent." });
    }

    const transporter = getMailTransport();
    if (!transporter) {
      return res.status(503).json({
        message: "Password reset email is not configured on this server.",
      });
    }
    const token = randomBytes(32).toString("hex");
    await db.promise().execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
      [user.id],
    );
    await db.promise().execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
      [user.id, hashToken(token)],
    );
    const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset-password/${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Reset your ResearchHub password",
      text: `Hello ${user.name},\n\nReset your ResearchHub password within 30 minutes: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    });
    return res.status(202).json({ message: "If that account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.status(500).json({ message: "Unable to request a password reset." });
  }
};

const resetPassword = async (req, res) => {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  const password = req.body.password;
  if (!/^[a-f0-9]{64}$/i.test(token) || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(422).json({ message: "The reset link or password is invalid." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [tokens] = await connection.execute(
      `SELECT id, user_id, (expires_at <= UTC_TIMESTAMP()) AS expired
       FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL
       FOR UPDATE`,
      [hashToken(token)],
    );
    const resetToken = tokens[0];
    if (!resetToken || resetToken.expired) {
      await connection.rollback();
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [passwordHash, resetToken.user_id]);
    await connection.execute("UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?", [resetToken.id]);
    await connection.commit();
    return res.status(200).json({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    await connection.rollback();
    console.error("Password reset failed:", error);
    return res.status(500).json({ message: "Unable to reset password." });
  } finally {
    connection.release();
  }
};

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendEmailVerification,
  requestPasswordReset,
  resetPassword,
};
