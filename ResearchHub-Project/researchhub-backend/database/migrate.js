const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mysql = require("mysql2/promise");

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "researchhub",
    multipleStatements: true,
  });

  console.log("Connected to MySQL. Running migrations...");

  // 1. student_profiles table
  const studentProfilesSql = `
    CREATE TABLE IF NOT EXISTS student_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      phone VARCHAR(30) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender ENUM('male', 'female', 'other') NOT NULL,
      enrollment_number VARCHAR(100) NOT NULL,
      specialization VARCHAR(150) NULL,
      year VARCHAR(50) NULL,
      semester VARCHAR(50) NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      pincode VARCHAR(20) NULL,
      research_interests TEXT NULL,
      skills TEXT NULL,
      bio TEXT NULL,
      research_areas TEXT NULL,
      previous_projects TEXT NULL,
      publications TEXT NULL,
      research_experience TEXT NULL,
      profile_completed BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_student_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;
  await connection.query(studentProfilesSql);
  console.log("✓ student_profiles created or verified.");

  // 2. researchhub_group_repositories.sql
  const groupRepoSql = fs.readFileSync(
    path.join(__dirname, "researchhub_group_repositories.sql"),
    "utf8"
  );
  // remove USE researchhub; as we already connected to database
  const cleanGroupRepoSql = groupRepoSql.replace(/USE\s+researchhub\s*;/gi, "");
  await connection.query(cleanGroupRepoSql);
  console.log("✓ researchhub_group_repositories.sql executed successfully.");

  // 3. researchhub_lifecycle.sql
  const lifecycleSql = fs.readFileSync(
    path.join(__dirname, "researchhub_lifecycle.sql"),
    "utf8"
  );
  const cleanLifecycleSql = lifecycleSql.replace(/USE\s+researchhub\s*;/gi, "");
  await connection.query(cleanLifecycleSql);
  console.log("✓ researchhub_lifecycle.sql executed successfully.");

  await connection.query(`
    ALTER TABLE milestones
      ADD COLUMN IF NOT EXISTS marks INT NOT NULL DEFAULT 0 AFTER description,
      ADD COLUMN IF NOT EXISTS earned_marks INT NOT NULL DEFAULT 0 AFTER marks,
      ADD COLUMN IF NOT EXISTS assigned_to INT NULL AFTER created_by;
  `);
  await connection.query(`
    UPDATE milestones
    SET marks = COALESCE(marks, weight),
        earned_marks = LEAST(COALESCE(earned_marks, 0), COALESCE(marks, weight, 0)),
        weight = COALESCE(marks, weight, weight)
    WHERE repository_id IS NOT NULL;
  `);
  await connection.query(`
    ALTER TABLE milestones
      MODIFY status ENUM('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'OVERDUE', 'COMPLETED', 'LATE') NOT NULL DEFAULT 'NOT_STARTED';
  `);
  await connection.query(`
    ALTER TABLE milestones
      ADD CONSTRAINT chk_milestones_marks CHECK (marks >= 0 AND marks <= 20),
      ADD CONSTRAINT chk_milestones_earned_marks CHECK (earned_marks >= 0 AND earned_marks <= 20);
  `);

  const [tables] = await connection.query("SHOW TABLES;");
  console.log("Current tables in database:", tables.map(r => Object.values(r)[0]));

  await connection.end();
  console.log("Migration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
