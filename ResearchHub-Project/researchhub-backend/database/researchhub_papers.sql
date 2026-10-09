CREATE TABLE IF NOT EXISTS paper_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL UNIQUE,
    description VARCHAR(1000) NOT NULL,
    type VARCHAR(60) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_template_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    section_name VARCHAR(180) NOT NULL,
    section_key VARCHAR(100) NOT NULL,
    section_order INT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    description VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paper_template_section_key (template_id, section_key),
    CONSTRAINT fk_paper_template_sections_template
        FOREIGN KEY (template_id) REFERENCES paper_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_papers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL UNIQUE,
    template_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    status ENUM('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_research_papers_template (template_id),
    CONSTRAINT fk_research_papers_project
        FOREIGN KEY (project_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_research_papers_template
        FOREIGN KEY (template_id) REFERENCES paper_templates(id),
    CONSTRAINT fk_research_papers_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS paper_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    template_section_id INT NULL,
    section_title VARCHAR(180) NOT NULL,
    section_key VARCHAR(100) NOT NULL,
    section_order INT NOT NULL,
    content LONGTEXT NOT NULL,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    word_count INT UNSIGNED NOT NULL DEFAULT 0,
    updated_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paper_section_key (paper_id, section_key),
    INDEX idx_paper_sections_order (paper_id, section_order),
    CONSTRAINT fk_paper_sections_paper
        FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_sections_template
        FOREIGN KEY (template_section_id) REFERENCES paper_template_sections(id) ON DELETE SET NULL,
    CONSTRAINT fk_paper_sections_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS paper_section_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    section_id INT NOT NULL,
    updated_by INT NOT NULL,
    content LONGTEXT NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paper_section_version (section_id, version_number),
    INDEX idx_paper_history (paper_id, section_id, version_number),
    CONSTRAINT fk_paper_versions_paper
        FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_versions_section
        FOREIGN KEY (section_id) REFERENCES paper_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_versions_user
        FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS paper_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paper_id INT NOT NULL,
    submitted_by INT NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    paper_snapshot LONGTEXT NOT NULL,
    student_notes TEXT NULL,
    status ENUM('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED') NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paper_submission_version (paper_id, version_number),
    INDEX idx_paper_submissions_latest (paper_id, version_number),
    CONSTRAINT fk_paper_submissions_paper
        FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_submissions_user
        FOREIGN KEY (submitted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS paper_submission_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL UNIQUE,
    reviewer_id INT NOT NULL,
    decision ENUM('APPROVED', 'REVISION_REQUIRED') NOT NULL,
    remarks TEXT NULL,
    improvements TEXT NULL,
    marks_awarded DECIMAL(7,2) NOT NULL,
    marks_visible_to_student BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paper_submission_reviews_submission
        FOREIGN KEY (submission_id) REFERENCES paper_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_submission_reviews_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS paper_review_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    suggestion_text TEXT NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'ACCEPTED') NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paper_review_suggestions_open (review_id, status),
    CONSTRAINT fk_paper_review_suggestions_review
        FOREIGN KEY (review_id) REFERENCES paper_submission_reviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_submission_suggestion_responses (
    submission_id INT NOT NULL,
    suggestion_id INT NOT NULL,
    response TEXT NOT NULL,
    response_status ENUM('ADDRESSED', 'IN_PROGRESS') NOT NULL,
    PRIMARY KEY (submission_id, suggestion_id),
    CONSTRAINT fk_paper_submission_suggestion_responses_submission
        FOREIGN KEY (submission_id) REFERENCES paper_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_paper_submission_suggestion_responses_suggestion
        FOREIGN KEY (suggestion_id) REFERENCES paper_review_suggestions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_paper_sections (
    milestone_id INT NOT NULL,
    paper_section_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (milestone_id, paper_section_id),
    CONSTRAINT fk_milestone_paper_sections_milestone
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestone_paper_sections_section
        FOREIGN KEY (paper_section_id) REFERENCES paper_sections(id) ON DELETE CASCADE
);

INSERT INTO paper_templates (name, description, type, is_active)
VALUES
    ('Standard Academic Research Paper', 'A complete academic paper structure for original research.', 'STANDARD', TRUE),
    ('IEEE-style Research Paper', 'A concise technical paper structure for engineering and computing research.', 'IEEE', TRUE),
    ('Review/Literature Research Paper', 'A structured format for systematic or narrative literature reviews.', 'REVIEW', TRUE)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    type = VALUES(type),
    is_active = VALUES(is_active);

INSERT INTO paper_template_sections
    (template_id, section_name, section_key, section_order, is_required, description)
SELECT t.id, sections.section_name, sections.section_key, sections.section_order, TRUE, sections.description
FROM paper_templates t
JOIN (
    SELECT 'STANDARD' AS template_type, 'Title' AS section_name, 'title' AS section_key, 1 AS section_order, 'Working title of the research.' AS description UNION ALL
    SELECT 'STANDARD', 'Abstract', 'abstract', 2, 'Summarize the research question, method, findings, and contribution.' UNION ALL
    SELECT 'STANDARD', 'Keywords', 'keywords', 3, 'List the key terms used to describe the paper.' UNION ALL
    SELECT 'STANDARD', 'Introduction', 'introduction', 4, 'Introduce the topic, context, and research question.' UNION ALL
    SELECT 'STANDARD', 'Literature Review', 'literature-review', 5, 'Review relevant prior research.' UNION ALL
    SELECT 'STANDARD', 'Research Gap', 'research-gap', 6, 'Explain the gap addressed by this research.' UNION ALL
    SELECT 'STANDARD', 'Research Objectives', 'objectives', 7, 'State the research objectives or questions.' UNION ALL
    SELECT 'STANDARD', 'Methodology', 'methodology', 8, 'Describe the research design, data, and methods.' UNION ALL
    SELECT 'STANDARD', 'Results', 'results', 9, 'Present the results of the research.' UNION ALL
    SELECT 'STANDARD', 'Discussion', 'discussion', 10, 'Interpret the findings and their implications.' UNION ALL
    SELECT 'STANDARD', 'Conclusion', 'conclusion', 11, 'Summarize conclusions, limitations, and future work.' UNION ALL
    SELECT 'STANDARD', 'References', 'references', 12, 'List the sources cited in the paper.' UNION ALL
    SELECT 'IEEE', 'Title', 'title', 1, 'Concise technical paper title.' UNION ALL
    SELECT 'IEEE', 'Abstract', 'abstract', 2, 'Summarize the technical problem, approach, and findings.' UNION ALL
    SELECT 'IEEE', 'Index Terms', 'keywords', 3, 'List index terms for the paper.' UNION ALL
    SELECT 'IEEE', 'Introduction', 'introduction', 4, 'Introduce the problem, context, and contribution.' UNION ALL
    SELECT 'IEEE', 'Related Work', 'literature-review', 5, 'Discuss related technical work.' UNION ALL
    SELECT 'IEEE', 'System Model and Problem Formulation', 'system-model', 6, 'Define the system and research problem.' UNION ALL
    SELECT 'IEEE', 'Methodology', 'methodology', 7, 'Describe the proposed method or system.' UNION ALL
    SELECT 'IEEE', 'Experimental Results', 'results', 8, 'Present the evaluation and results.' UNION ALL
    SELECT 'IEEE', 'Discussion', 'discussion', 9, 'Interpret the findings and limitations.' UNION ALL
    SELECT 'IEEE', 'Conclusion', 'conclusion', 10, 'Summarize contributions and future directions.' UNION ALL
    SELECT 'IEEE', 'References', 'references', 11, 'List references in IEEE style.' UNION ALL
    SELECT 'REVIEW', 'Title', 'title', 1, 'Title of the review paper.' UNION ALL
    SELECT 'REVIEW', 'Abstract', 'abstract', 2, 'Summarize the scope and findings of the review.' UNION ALL
    SELECT 'REVIEW', 'Keywords', 'keywords', 3, 'List the key review topics.' UNION ALL
    SELECT 'REVIEW', 'Introduction and Scope', 'introduction', 4, 'Define the topic, scope, and review questions.' UNION ALL
    SELECT 'REVIEW', 'Review Methodology', 'methodology', 5, 'Describe search sources, criteria, and synthesis approach.' UNION ALL
    SELECT 'REVIEW', 'Thematic Literature Review', 'literature-review', 6, 'Synthesize the literature by themes.' UNION ALL
    SELECT 'REVIEW', 'Research Gaps', 'research-gap', 7, 'Identify gaps and unresolved questions.' UNION ALL
    SELECT 'REVIEW', 'Discussion', 'discussion', 8, 'Discuss patterns and implications across the literature.' UNION ALL
    SELECT 'REVIEW', 'Conclusion and Future Directions', 'conclusion', 9, 'Summarize the review and future research needs.' UNION ALL
    SELECT 'REVIEW', 'References', 'references', 10, 'List all sources reviewed.'
) AS sections ON sections.template_type = t.type
ON DUPLICATE KEY UPDATE
    section_name = VALUES(section_name),
    section_order = VALUES(section_order),
    is_required = VALUES(is_required),
    description = VALUES(description);
