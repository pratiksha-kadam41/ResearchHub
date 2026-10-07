const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================================================
// REGISTER USER
// =====================================================

const registerUser = async (req, res) => {
  const { name, email, password, role, institution, course } = req.body;

  // 1. Check required fields
  if (!name || !email || !password || !role || !institution) {
    return res.status(400).json({
      message: "Please fill all required fields",
    });
  }

  // 2. Course is required only for students
  if (role === "student" && !course) {
    return res.status(400).json({
      message: "Course is required for students",
    });
  }

  // 3. Check whether email already exists
  const checkEmailSql = `
    SELECT id
    FROM users
    WHERE email = ?
  `;

  db.query(checkEmailSql, [email], async (err, results) => {
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert user
    const insertSql = `
      INSERT INTO users
      (name, email, password, role, institution, course)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const userCourse = role === "student" ? course : null;

    db.query(
      insertSql,
      [name, email, hashedPassword, role, institution, userCourse],
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

  // 1. Check required fields
  if (!email || !password) {
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

  db.query(sql, [email], async (err, results) => {
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
    const passwordMatch = await bcrypt.compare(password, user.password);

    // 5. Password is incorrect
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 6. Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET || "researchhub_secret_key",
      {
        expiresIn: "1d",
      },
    );

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

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

module.exports = {
  registerUser,
  loginUser,
};
