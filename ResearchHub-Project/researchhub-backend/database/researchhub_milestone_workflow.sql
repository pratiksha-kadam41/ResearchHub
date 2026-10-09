CREATE TABLE IF NOT EXISTS milestone_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    project_id INT NOT NULL,
    milestone_id INT NOT NULL,
    suggestion_text TEXT NOT NULL,
    improvement_text TEXT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'ADDRESSED', 'ACCEPTED') NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_milestone_suggestions_project_status (project_id, status),
    INDEX idx_milestone_suggestions_milestone (milestone_id),
    CONSTRAINT fk_milestone_suggestions_review
        FOREIGN KEY (review_id) REFERENCES submission_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestone_suggestions_project
        FOREIGN KEY (project_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestone_suggestions_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submission_suggestion_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    suggestion_id INT NOT NULL,
    response TEXT NOT NULL,
    status ENUM('IN_PROGRESS', 'ADDRESSED') NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_submission_suggestion_response (submission_id, suggestion_id),
    INDEX idx_suggestion_responses_suggestion (suggestion_id, created_at),
    CONSTRAINT fk_suggestion_responses_submission
        FOREIGN KEY (submission_id) REFERENCES milestone_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_suggestion_responses_suggestion
        FOREIGN KEY (suggestion_id) REFERENCES milestone_suggestions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submission_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    suggestion_id INT NULL,
    file_path VARCHAR(512) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_submission_files_submission (submission_id, uploaded_at),
    INDEX idx_submission_files_suggestion (suggestion_id),
    CONSTRAINT fk_submission_files_submission
        FOREIGN KEY (submission_id) REFERENCES milestone_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_files_suggestion
        FOREIGN KEY (suggestion_id) REFERENCES milestone_suggestions(id) ON DELETE SET NULL,
    CONSTRAINT fk_submission_files_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_deadline_reminders (
    milestone_id INT NOT NULL,
    user_id INT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (milestone_id, user_id),
    CONSTRAINT fk_milestone_reminders_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestone_reminders_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
