USE researchhub;

-- Run this migration after the existing SQL Queries.sql and
-- researchhub_group_repositories.sql scripts. It only adds the lifecycle
-- entities; it deliberately keeps `faculty` as the existing professor role.

ALTER TABLE repositories
    MODIFY privacy ENUM('private', 'shared', 'public') NOT NULL;

CREATE TABLE IF NOT EXISTS faculty_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    designation VARCHAR(150) NULL,
    research_areas TEXT NULL,
    expertise TEXT NULL,
    research_interests TEXT NULL,
    experience TEXT NULL,
    publications TEXT NULL,
    research_projects TEXT NULL,
    guidance_areas TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_faculty_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentor_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    faculty_id INT NOT NULL,
    requested_by INT NOT NULL,
    message TEXT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    responded_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mentor_requests_faculty_status (faculty_id, status),
    INDEX idx_mentor_requests_repository_status (repository_id, status),
    CONSTRAINT fk_mentor_requests_repository
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentor_requests_faculty
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentor_requests_requester
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    marks INT NOT NULL DEFAULT 0,
    earned_marks INT NOT NULL DEFAULT 0,
    weight DECIMAL(5,2) NOT NULL DEFAULT 0,
    deadline DATETIME NOT NULL,
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    status ENUM('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'OVERDUE', 'COMPLETED', 'LATE') NOT NULL DEFAULT 'NOT_STARTED',
    submission_status ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    extension_requested_deadline DATETIME NULL,
    extension_reason TEXT NULL,
    extension_status ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_milestones_repository_deadline (repository_id, deadline),
    INDEX idx_milestones_repository_marks (repository_id, marks),
    CONSTRAINT fk_milestones_repository
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestones_creator
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_milestones_marks CHECK (marks >= 0 AND marks <= 20),
    CONSTRAINT chk_milestones_earned_marks CHECK (earned_marks >= 0 AND earned_marks <= 20)
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    deadline DATETIME NOT NULL,
    assigned_to INT NULL,
    status ENUM('TODO', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'TODO',
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tasks_milestone_deadline (milestone_id, deadline),
    INDEX idx_tasks_assignee_status (assigned_to, status),
    CONSTRAINT fk_tasks_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    resource_type ENUM('PDF', 'DOC', 'DOCX', 'IMAGE', 'DATASET', 'SOURCE_CODE', 'PAPER', 'TEMPLATE', 'LINK', 'OTHER') NOT NULL DEFAULT 'LINK',
    resource_url VARCHAR(2048) NOT NULL,
    notes TEXT NULL,
    visibility ENUM('PROJECT', 'SHARED', 'PUBLIC') NOT NULL DEFAULT 'PROJECT',
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_resources_repository_type (repository_id, resource_type),
    INDEX idx_resources_visibility_created (visibility, created_at),
    CONSTRAINT fk_resources_repository
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_resources_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL,
    submitted_by INT NOT NULL,
    work_url VARCHAR(2048) NULL,
    notes TEXT NULL,
    version_number INT NOT NULL,
    status ENUM('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_submissions_milestone_version (milestone_id, version_number),
    CONSTRAINT fk_submissions_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_submitter
        FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submission_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    reviewed_by INT NOT NULL,
    decision ENUM('APPROVED', 'REVISION_REQUIRED', 'REJECTED') NOT NULL,
    feedback TEXT NULL,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission_reviews_submission
        FOREIGN KEY (submission_id) REFERENCES milestone_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_reviews_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    milestone_id INT NULL,
    submission_id INT NULL,
    student_id INT NOT NULL,
    evaluator_id INT NOT NULL,
    original_marks DECIMAL(6,2) NOT NULL,
    deducted_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
    final_marks DECIMAL(6,2) NOT NULL,
    deduction_reason TEXT NULL,
    evaluation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evaluations_repository_student (repository_id, student_id),
    INDEX idx_evaluations_milestone (milestone_id),
    CONSTRAINT fk_evaluations_repository
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    CONSTRAINT fk_evaluations_submission
        FOREIGN KEY (submission_id) REFERENCES milestone_submissions(id) ON DELETE SET NULL,
    CONSTRAINT fk_evaluations_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_evaluator
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    milestone_id INT NULL,
    author_id INT NOT NULL,
    body TEXT NOT NULL,
    comment_type ENUM('DISCUSSION', 'QUESTION', 'FEEDBACK', 'REVISION') NOT NULL DEFAULT 'DISCUSSION',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_comments_repository_created (repository_id, created_at),
    CONSTRAINT fk_comments_repository
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    CONSTRAINT fk_comments_author
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link_url VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_tokens_user (user_id),
    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
