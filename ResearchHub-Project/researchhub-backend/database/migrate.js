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

  const [userColumns] = await connection.query("SHOW COLUMNS FROM users");
  const existingUserColumns = new Set(userColumns.map((column) => column.Field));
  const userColumnsToAdd = [
    ["email_verified", "BOOLEAN NOT NULL DEFAULT FALSE"],
    ["is_active", "BOOLEAN NOT NULL DEFAULT TRUE"],
    ["email_verification_token_hash", "CHAR(64) NULL"],
    ["email_verification_expires_at", "DATETIME NULL"],
    ["email_verification_attempts", "TINYINT UNSIGNED NOT NULL DEFAULT 0"],
  ];
  for (const [column, definition] of userColumnsToAdd) {
    if (!existingUserColumns.has(column)) {
      await connection.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    }
  }
  console.log("✓ User email verification and account status columns created or verified.");

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

  const [invitationColumns] = await connection.query(
    "SHOW COLUMNS FROM repository_invitations",
  );
  const existingInvitationColumns = new Set(
    invitationColumns.map((column) => column.Field),
  );
  if (!existingInvitationColumns.has("invited_user_id")) {
    await connection.query(
      "ALTER TABLE repository_invitations ADD COLUMN invited_user_id INT NULL AFTER inviter_id",
    );
  }
  await connection.query(`
    UPDATE repository_invitations ri
    INNER JOIN users u ON LOWER(u.email) = LOWER(ri.email) AND u.role = 'student'
    SET ri.invited_user_id = u.id
    WHERE ri.invited_user_id IS NULL
  `);
  const [invitationIndexes] = await connection.query(
    "SHOW INDEX FROM repository_invitations",
  );
  if (!invitationIndexes.some((index) => index.Key_name === "idx_repository_invitations_invited_user")) {
    await connection.query(
      "ALTER TABLE repository_invitations ADD INDEX idx_repository_invitations_invited_user (invited_user_id)",
    );
  }
  const [invitationForeignKeys] = await connection.execute(
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = 'repository_invitations'
       AND CONSTRAINT_NAME = 'fk_repository_invitations_invited_user'
     LIMIT 1`,
  );
  if (invitationForeignKeys.length === 0) {
    await connection.query(`
      ALTER TABLE repository_invitations
      ADD CONSTRAINT fk_repository_invitations_invited_user
      FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  }
  console.log("✓ Invitation-to-student relationships created or verified.");

  // 3. researchhub_lifecycle.sql
  const lifecycleSql = fs.readFileSync(
    path.join(__dirname, "researchhub_lifecycle.sql"),
    "utf8"
  );
  const cleanLifecycleSql = lifecycleSql.replace(/USE\s+researchhub\s*;/gi, "");
  await connection.query(cleanLifecycleSql);
  console.log("✓ researchhub_lifecycle.sql executed successfully.");

  const milestoneWorkflowSql = fs.readFileSync(
    path.join(__dirname, "researchhub_milestone_workflow.sql"),
    "utf8"
  );
  await connection.query(milestoneWorkflowSql);

  const researchPapersSql = fs.readFileSync(
    path.join(__dirname, "researchhub_papers.sql"),
    "utf8"
  );
  await connection.query(researchPapersSql);

  const ensureColumns = async (table, columns) => {
    const [existingColumns] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    const existingColumnNames = new Set(existingColumns.map((column) => column.Field));
    for (const [column, definition] of columns) {
      if (!existingColumnNames.has(column)) {
        await connection.query(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
        );
      }
    }
  };

  await ensureColumns("student_profiles", [
    ["research_areas", "TEXT NULL"],
    ["previous_projects", "TEXT NULL"],
    ["publications", "TEXT NULL"],
    ["research_experience", "TEXT NULL"],
  ]);
  await ensureColumns("resources", [
    ["file_name", "VARCHAR(255) NULL AFTER resource_url"],
    ["mime_type", "VARCHAR(150) NULL AFTER file_name"],
    ["file_data", "LONGBLOB NULL AFTER mime_type"],
  ]);

  await ensureColumns("milestones", [
    ["order_no", "INT NOT NULL DEFAULT 0 AFTER created_by"],
    ["instructions", "TEXT NULL AFTER description"],
    ["meeting_date", "DATE NULL AFTER deadline"],
  ]);
  await ensureColumns("milestone_submissions", [
    ["is_late", "BOOLEAN NOT NULL DEFAULT FALSE AFTER submitted_at"],
    ["updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ]);
  await ensureColumns("submission_reviews", [
    ["remarks", "TEXT NULL AFTER feedback"],
    ["improvements", "TEXT NULL AFTER remarks"],
    ["marks_awarded", "DECIMAL(7,2) NULL AFTER improvements"],
    ["marks_visible_to_student", "BOOLEAN NOT NULL DEFAULT FALSE AFTER marks_awarded"],
  ]);
  await connection.query(
    "UPDATE submission_reviews SET remarks = feedback WHERE remarks IS NULL AND feedback IS NOT NULL",
  );

  const [milestoneColumns] = await connection.query("SHOW COLUMNS FROM milestones");
  const existingMilestoneColumns = new Set(
    milestoneColumns.map((column) => column.Field),
  );
  const milestoneColumnsToAdd = [
    ["marks", "INT NOT NULL DEFAULT 0 AFTER description"],
    ["earned_marks", "INT NOT NULL DEFAULT 0 AFTER marks"],
    ["assigned_to", "INT NULL AFTER created_by"],
  ];

  for (const [column, definition] of milestoneColumnsToAdd) {
    if (!existingMilestoneColumns.has(column)) {
      await connection.query(
        `ALTER TABLE milestones ADD COLUMN ${column} ${definition}`,
      );
    }
  }

  await connection.query(`
    UPDATE milestones
    SET marks = COALESCE(marks, weight),
        earned_marks = LEAST(COALESCE(earned_marks, 0), COALESCE(marks, weight, 0)),
        weight = COALESCE(marks, weight, weight)
    WHERE repository_id IS NOT NULL;
  `);

  for (const constraint of ["chk_milestones_marks", "chk_milestones_earned_marks"]) {
    const [existingConstraints] = await connection.execute(
      `SELECT 1
       FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME = 'milestones'
         AND CONSTRAINT_NAME = ?
         AND CONSTRAINT_TYPE = 'CHECK'
       LIMIT 1`,
      [constraint],
    );
    if (existingConstraints.length > 0) {
      await connection.query(`ALTER TABLE milestones DROP CHECK \`${constraint}\``);
    }
  }

  await connection.query(`
    ALTER TABLE milestones
      MODIFY marks INT NOT NULL DEFAULT 0,
      MODIFY earned_marks INT NOT NULL DEFAULT 0,
      MODIFY status ENUM(
        'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW',
        'REVISION_REQUIRED', 'APPROVED', 'OVERDUE',
        'PENDING', 'REJECTED', 'COMPLETED', 'LATE'
      ) NOT NULL DEFAULT 'NOT_STARTED';
  `);

  for (const [constraint, definition] of [
    ["chk_milestones_marks", "CHECK (marks >= 0 AND marks <= 100)"],
    ["chk_milestones_earned_marks", "CHECK (earned_marks >= 0 AND earned_marks <= 100)"],
  ]) {
    const [existingConstraints] = await connection.execute(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'milestones'
         AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'
       LIMIT 1`,
      [constraint],
    );
    if (existingConstraints.length === 0) {
      await connection.query(
        `ALTER TABLE milestones ADD CONSTRAINT \`${constraint}\` ${definition}`,
      );
    }
  }

  const [milestonesInOrder] = await connection.query(
    `SELECT id, repository_id FROM milestones
     WHERE order_no = 0 ORDER BY repository_id, deadline, id`,
  );
  let currentRepositoryId = null;
  let milestoneOrder = 0;
  for (const milestone of milestonesInOrder) {
    if (milestone.repository_id !== currentRepositoryId) {
      currentRepositoryId = milestone.repository_id;
      const [[existingOrder]] = await connection.execute(
        "SELECT COALESCE(MAX(order_no), 0) AS max_order FROM milestones WHERE repository_id = ?",
        [currentRepositoryId],
      );
      milestoneOrder = Number(existingOrder.max_order);
    }
    milestoneOrder += 1;
    await connection.execute(
      "UPDATE milestones SET order_no = ? WHERE id = ?",
      [milestoneOrder, milestone.id],
    );
  }
  console.log("✓ Project milestone lifecycle fields and feedback/file tables created or verified.");

  const [tables] = await connection.query("SHOW TABLES;");
  console.log("Current tables in database:", tables.map(r => Object.values(r)[0]));

  await connection.end();
  console.log("Migration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
