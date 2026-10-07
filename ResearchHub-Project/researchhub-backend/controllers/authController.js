const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createHash, randomBytes } = require("node:crypto");
const nodemailer = require("nodemailer");
const { getJwtSecret } = require("../config/security");

const ROLES = ["student", "faculty"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseText = (value) =>
  typeof value === "string" ? value.trim() : "";

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const getPasswordResetTransport = () => {
  const { SMTP_USER, SMTP_PASS, SMTP_HOST = "smtp.gmail.com", SMTP_PORT = "587" } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
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

  // 3. Check whether email already exists
  const checkEmailSql = `
    SELECT id
    FROM users
    WHERE email = ?
  `;

  db.query(checkEmailSql, [normalizedEmail], async (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    // Email already exists
    if (results.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    // 4. Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (hashError) {
      console.error("Password hashing failed:", hashError);
      return res.status(500).json({ message: "Unable to create account" });
    }

    // 5. Insert user
    const insertSql = `
      INSERT INTO users
      (name, email, password, role, institution, course)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const userCourse = role === "student" ? normalizedCourse : null;

    db.query(
      insertSql,
      [normalizedName, normalizedEmail, hashedPassword, role, normalizedInstitution, userCourse],
      (err, result) => {
        if (err) {
          console.error(err);

          return res.status(500).json({
            message: "Unable to create account",
          });
        }

        return res.status(201).json({
          message: "Registration successful",
          userId: result.insertId,
        });
      },
    );
  });
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

    const transporter = getPasswordResetTransport();
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
  requestPasswordReset,
  resetPassword,
};
