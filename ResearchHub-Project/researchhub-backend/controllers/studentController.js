const db = require("../config/db");

// =====================================================
// GET LOGGED-IN STUDENT ACCOUNT INFORMATION
// =====================================================

const getStudentProfile = (req, res) => {
  const studentId = req.user.id;

  const sql = `
        SELECT 
            id, 
            name, 
            email, 
            role, 
            institution, 
            course, 
            created_at 
        FROM users 
        WHERE id = ?
    `;

  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("Get student error:", err);

      return res.status(500).json({
        message: "Unable to fetch student information.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    return res.status(200).json({
      message: "Student information fetched successfully.",
      user: results[0],
    });
  });
};

// =====================================================
// GET STUDENT PROFILE
// =====================================================

const getStudentDetailedProfile = (req, res) => {
  const studentId = req.user.id;

  const sql = `
        SELECT 
            sp.id, 
            sp.user_id, 
            u.name, 
            u.email, 
            u.role, 
            u.institution, 
            u.course, 

            sp.phone, 
            sp.date_of_birth, 
            sp.gender, 
            sp.enrollment_number, 
            sp.specialization, 
            sp.year, 
            sp.semester, 
            sp.address, 
            sp.city, 
            sp.state, 
            sp.pincode, 
            sp.research_interests, 
            sp.skills, 
            sp.bio, 
            sp.profile_completed, 
            sp.created_at, 
            sp.updated_at 

        FROM student_profiles sp 

        INNER JOIN users u 
            ON sp.user_id = u.id 

        WHERE sp.user_id = ?
    `;

  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("Get detailed profile error:", err);

      return res.status(500).json({
        message: "Unable to fetch profile information.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Student profile has not been created yet.",
        profileCompleted: false,
      });
    }

    return res.status(200).json({
      message: "Student profile fetched successfully.",
      profileCompleted: Boolean(results[0].profile_completed),
      profile: results[0],
    });
  });
};

// =====================================================
// CREATE STUDENT PROFILE
// =====================================================

const createStudentProfile = (req, res) => {
  const studentId = req.user.id;

  const {
    phone,
    date_of_birth,
    gender,
    enrollment_number,
    specialization,
    year,
    semester,
    address,
    city,
    state,
    pincode,
    research_interests,
    skills,
    bio,
  } = req.body;

  // ---------------------------------------------
  // Basic validation
  // ---------------------------------------------

  if (!phone || !date_of_birth || !gender || !enrollment_number) {
    return res.status(400).json({
      message: "Please fill all required profile information.",
    });
  }

  // ---------------------------------------------
  // Check whether profile already exists
  // ---------------------------------------------

  const checkSql = `
        SELECT id 
        FROM student_profiles 
        WHERE user_id = ?
    `;

  db.query(checkSql, [studentId], (err, results) => {
    if (err) {
      console.error("Check profile error:", err);

      return res.status(500).json({
        message: "Unable to check existing profile.",
      });
    }

    if (results.length > 0) {
      return res.status(409).json({
        message:
          "Your profile already exists. Please use Edit Profile to make changes.",
      });
    }

    // ---------------------------------------------
    // Insert profile
    // ---------------------------------------------

    const insertSql = `
            INSERT INTO student_profiles 
            (
                user_id, 
                phone, 
                date_of_birth, 
                gender, 
                enrollment_number, 
                specialization, 
                year, 
                semester, 
                address, 
                city, 
                state, 
                pincode, 
                research_interests, 
                skills, 
                bio, 
                profile_completed
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    db.query(
      insertSql,
      [
        studentId,
        phone,
        date_of_birth,
        gender,
        enrollment_number,
        specialization || null,
        year || null,
        semester || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        research_interests || null,
        skills || null,
        bio || null,
        true,
      ],
      (err, result) => {
        if (err) {
          console.error("Create student profile error:", err);

          return res.status(500).json({
            message: "Unable to save your profile. Please try again.",
          });
        }

        return res.status(201).json({
          message: "Profile completed successfully.",
          profileId: result.insertId,
        });
      },
    );
  });
};

// =====================================================
// UPDATE STUDENT PROFILE
// =====================================================

const updateStudentProfile = (req, res) => {
  const studentId = req.user.id;

  const {
    phone,
    date_of_birth,
    gender,
    enrollment_number,
    specialization,
    year,
    semester,
    address,
    city,
    state,
    pincode,
    research_interests,
    skills,
    bio,
  } = req.body;

  // ---------------------------------------------
  // Basic validation
  // ---------------------------------------------

  if (!phone || !date_of_birth || !gender || !enrollment_number) {
    return res.status(400).json({
      message: "Please fill all required profile information.",
    });
  }

  // ---------------------------------------------
  // Validate gender
  // ---------------------------------------------

  if (!["male", "female", "other"].includes(gender)) {
    return res.status(400).json({
      message: "Invalid gender selected.",
    });
  }

  // ---------------------------------------------
  // Check whether profile exists
  // ---------------------------------------------

  const checkSql = `
        SELECT id
        FROM student_profiles
        WHERE user_id = ?
    `;

  db.query(checkSql, [studentId], (err, results) => {
    if (err) {
      console.error("Check profile before update error:", err);

      return res.status(500).json({
        message: "Unable to check existing profile.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Student profile has not been created yet.",
      });
    }

    // ---------------------------------------------
    // Update profile
    // ---------------------------------------------

    const updateSql = `
        UPDATE student_profiles
        SET
            phone = ?,
            date_of_birth = ?,
            gender = ?,
            enrollment_number = ?,
            specialization = ?,
            year = ?,
            semester = ?,
            address = ?,
            city = ?,
            state = ?,
            pincode = ?,
            research_interests = ?,
            skills = ?,
            bio = ?,
            profile_completed = ?
        WHERE user_id = ?
    `;

    db.query(
      updateSql,
      [
        phone,
        date_of_birth,
        gender,
        enrollment_number,
        specialization || null,
        year || null,
        semester || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        research_interests || null,
        skills || null,
        bio || null,
        true,
        studentId,
      ],
      (err, result) => {
        if (err) {
          console.error("Update student profile error:", err);

          return res.status(500).json({
            message: "Unable to update your profile. Please try again.",
          });
        }

        return res.status(200).json({
          message: "Profile updated successfully.",
        });
      },
    );
  });
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getStudentProfile,
  getStudentDetailedProfile,
  createStudentProfile,
  updateStudentProfile,
};
