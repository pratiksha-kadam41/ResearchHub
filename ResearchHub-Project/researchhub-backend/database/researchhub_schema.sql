-- ResearchHub database schema (table definitions only; no application data).

-- Generated from the configured MySQL database on 2026-10-09.

CREATE DATABASE IF NOT EXISTS `researchhub`;

USE `researchhub`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `milestone_id` int DEFAULT NULL,
  `author_id` int NOT NULL,
  `body` text NOT NULL,
  `comment_type` enum('DISCUSSION','QUESTION','FEEDBACK','REVISION') NOT NULL DEFAULT 'DISCUSSION',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_repository_created` (`repository_id`,`created_at`),
  KEY `fk_comments_milestone` (`milestone_id`),
  KEY `fk_comments_author` (`author_id`),
  CONSTRAINT `fk_comments_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comments_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `evaluations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `milestone_id` int DEFAULT NULL,
  `submission_id` int DEFAULT NULL,
  `student_id` int NOT NULL,
  `evaluator_id` int NOT NULL,
  `original_marks` decimal(6,2) NOT NULL,
  `deducted_marks` decimal(6,2) NOT NULL DEFAULT '0.00',
  `final_marks` decimal(6,2) NOT NULL,
  `deduction_reason` text,
  `evaluation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_evaluations_repository_student` (`repository_id`,`student_id`),
  KEY `idx_evaluations_milestone` (`milestone_id`),
  KEY `fk_evaluations_submission` (`submission_id`),
  KEY `fk_evaluations_student` (`student_id`),
  KEY `fk_evaluations_evaluator` (`evaluator_id`),
  CONSTRAINT `fk_evaluations_evaluator` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluations_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_evaluations_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluations_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluations_submission` FOREIGN KEY (`submission_id`) REFERENCES `milestone_submissions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `faculty_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `designation` varchar(150) DEFAULT NULL,
  `research_areas` text,
  `expertise` text,
  `research_interests` text,
  `experience` text,
  `publications` text,
  `research_projects` text,
  `guidance_areas` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_faculty_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `mentor_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `faculty_id` int NOT NULL,
  `requested_by` int NOT NULL,
  `message` text,
  `status` enum('PENDING','ACCEPTED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `responded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  KEY `idx_mentor_requests_faculty_status` (`faculty_id`,`status`),
  KEY `idx_mentor_requests_repository_status` (`repository_id`,`status`),
  KEY `fk_mentor_requests_requester` (`requested_by`),
  CONSTRAINT `fk_mentor_requests_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mentor_requests_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mentor_requests_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `milestone_deadline_reminders` (
  `milestone_id` int NOT NULL,
  `user_id` int NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`,`user_id`),
  KEY `fk_milestone_reminders_user` (`user_id`),
  CONSTRAINT `fk_milestone_reminders_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_milestone_reminders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `milestone_paper_sections` (
  `milestone_id` int NOT NULL,
  `paper_section_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`,`paper_section_id`),
  KEY `fk_milestone_paper_sections_section` (`paper_section_id`),
  CONSTRAINT `fk_milestone_paper_sections_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_milestone_paper_sections_section` FOREIGN KEY (`paper_section_id`) REFERENCES `paper_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `milestone_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `milestone_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `work_url` varchar(2048) DEFAULT NULL,
  `notes` text,
  `version_number` int NOT NULL,
  `status` enum('SUBMITTED','UNDER_REVIEW','REVISION_REQUIRED','RESUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_late` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_submissions_milestone_version` (`milestone_id`,`version_number`),
  KEY `fk_submissions_submitter` (`submitted_by`),
  CONSTRAINT `fk_submissions_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `milestone_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `project_id` int NOT NULL,
  `milestone_id` int NOT NULL,
  `suggestion_text` text NOT NULL,
  `improvement_text` text,
  `status` enum('OPEN','IN_PROGRESS','ADDRESSED','ACCEPTED') NOT NULL DEFAULT 'OPEN',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_milestone_suggestions_project_status` (`project_id`,`status`),
  KEY `idx_milestone_suggestions_milestone` (`milestone_id`),
  KEY `fk_milestone_suggestions_review` (`review_id`),
  CONSTRAINT `fk_milestone_suggestions_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_milestone_suggestions_project` FOREIGN KEY (`project_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_milestone_suggestions_review` FOREIGN KEY (`review_id`) REFERENCES `submission_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `created_by` int NOT NULL,
  `order_no` int NOT NULL DEFAULT '0',
  `assigned_to` int DEFAULT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `instructions` text,
  `marks` int NOT NULL DEFAULT '0',
  `earned_marks` int NOT NULL DEFAULT '0',
  `weight` decimal(5,2) NOT NULL,
  `deadline` datetime NOT NULL,
  `meeting_date` date DEFAULT NULL,
  `completion_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `status` enum('NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','REVISION_REQUIRED','APPROVED','OVERDUE','PENDING','REJECTED','COMPLETED','LATE') NOT NULL DEFAULT 'NOT_STARTED',
  `submission_status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','REVISION_REQUIRED','RESUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `extension_requested_deadline` datetime DEFAULT NULL,
  `extension_reason` text,
  `extension_status` enum('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_milestones_repository_deadline` (`repository_id`,`deadline`),
  KEY `fk_milestones_creator` (`created_by`),
  CONSTRAINT `fk_milestones_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_milestones_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_milestones_earned_marks` CHECK (((`earned_marks` >= 0) and (`earned_marks` <= 100))),
  CONSTRAINT `chk_milestones_marks` CHECK (((`marks` >= 0) and (`marks` <= 100)))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `message` varchar(500) NOT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read_created` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_review_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `suggestion_text` text NOT NULL,
  `status` enum('OPEN','IN_PROGRESS','ACCEPTED') NOT NULL DEFAULT 'OPEN',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paper_review_suggestions_open` (`review_id`,`status`),
  CONSTRAINT `fk_paper_review_suggestions_review` FOREIGN KEY (`review_id`) REFERENCES `paper_submission_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_section_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `section_id` int NOT NULL,
  `updated_by` int NOT NULL,
  `content` longtext NOT NULL,
  `version_number` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_paper_section_version` (`section_id`,`version_number`),
  KEY `idx_paper_history` (`paper_id`,`section_id`,`version_number`),
  KEY `fk_paper_versions_user` (`updated_by`),
  CONSTRAINT `fk_paper_versions_paper` FOREIGN KEY (`paper_id`) REFERENCES `research_papers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paper_versions_section` FOREIGN KEY (`section_id`) REFERENCES `paper_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paper_versions_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `template_section_id` int DEFAULT NULL,
  `section_title` varchar(180) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_order` int NOT NULL,
  `content` longtext NOT NULL,
  `status` enum('NOT_STARTED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  `word_count` int unsigned NOT NULL DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_paper_section_key` (`paper_id`,`section_key`),
  KEY `idx_paper_sections_order` (`paper_id`,`section_order`),
  KEY `fk_paper_sections_template` (`template_section_id`),
  KEY `fk_paper_sections_updated_by` (`updated_by`),
  CONSTRAINT `fk_paper_sections_paper` FOREIGN KEY (`paper_id`) REFERENCES `research_papers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paper_sections_template` FOREIGN KEY (`template_section_id`) REFERENCES `paper_template_sections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_paper_sections_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_submission_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `decision` enum('APPROVED','REVISION_REQUIRED') NOT NULL,
  `remarks` text,
  `improvements` text,
  `marks_awarded` decimal(7,2) NOT NULL,
  `marks_visible_to_student` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  KEY `fk_paper_submission_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_paper_submission_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_paper_submission_reviews_submission` FOREIGN KEY (`submission_id`) REFERENCES `paper_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_submission_suggestion_responses` (
  `submission_id` int NOT NULL,
  `suggestion_id` int NOT NULL,
  `response` text NOT NULL,
  `response_status` enum('ADDRESSED','IN_PROGRESS') NOT NULL,
  PRIMARY KEY (`submission_id`,`suggestion_id`),
  KEY `fk_paper_submission_suggestion_responses_suggestion` (`suggestion_id`),
  CONSTRAINT `fk_paper_submission_suggestion_responses_submission` FOREIGN KEY (`submission_id`) REFERENCES `paper_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paper_submission_suggestion_responses_suggestion` FOREIGN KEY (`suggestion_id`) REFERENCES `paper_review_suggestions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `version_number` int unsigned NOT NULL,
  `paper_snapshot` longtext NOT NULL,
  `student_notes` text,
  `status` enum('SUBMITTED','UNDER_REVIEW','REVISION_REQUIRED','APPROVED') NOT NULL DEFAULT 'SUBMITTED',
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_paper_submission_version` (`paper_id`,`version_number`),
  KEY `idx_paper_submissions_latest` (`paper_id`,`version_number`),
  KEY `fk_paper_submissions_user` (`submitted_by`),
  CONSTRAINT `fk_paper_submissions_paper` FOREIGN KEY (`paper_id`) REFERENCES `research_papers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paper_submissions_user` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_template_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `section_name` varchar(180) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_order` int NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `description` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_paper_template_section_key` (`template_id`,`section_key`),
  CONSTRAINT `fk_paper_template_sections_template` FOREIGN KEY (`template_id`) REFERENCES `paper_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `paper_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(180) NOT NULL,
  `description` varchar(1000) NOT NULL,
  `type` varchar(60) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_password_reset_tokens_user` (`user_id`),
  CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `project_result_publications` (
  `repository_id` int NOT NULL,
  `published_by` int NOT NULL,
  `published_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `results_snapshot` json NOT NULL,
  PRIMARY KEY (`repository_id`),
  KEY `fk_project_result_publications_publisher` (`published_by`),
  CONSTRAINT `fk_project_result_publications_publisher` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_result_publications_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `repositories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `domain` varchar(100) NOT NULL,
  `research_type` enum('individual','group') NOT NULL,
  `privacy` enum('private','shared','public') NOT NULL,
  `owner_id` int NOT NULL,
  `status` enum('ongoing','completed','archived') DEFAULT 'ongoing',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `repositories_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `repository_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` mediumtext NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_repository_documents_repository` (`repository_id`),
  KEY `fk_repository_documents_creator` (`created_by`),
  KEY `fk_repository_documents_updater` (`updated_by`),
  CONSTRAINT `fk_repository_documents_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repository_documents_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repository_documents_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `repository_invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `inviter_id` int NOT NULL,
  `invited_user_id` int DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `delivery_status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `expires_at` datetime NOT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `response_status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  UNIQUE KEY `unique_repository_invitation` (`repository_id`,`email`),
  KEY `idx_repository_invitations_token` (`token_hash`),
  KEY `idx_repository_invitations_inviter` (`inviter_id`),
  KEY `idx_repository_invitations_invited_user` (`invited_user_id`),
  CONSTRAINT `fk_repository_invitations_invited_user` FOREIGN KEY (`invited_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repository_invitations_inviter` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repository_invitations_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `repository_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `user_id` int NOT NULL,
  `member_role` enum('owner','member') NOT NULL DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_repository_member` (`repository_id`,`user_id`),
  KEY `idx_repository_members_user` (`user_id`),
  CONSTRAINT `fk_repository_members_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repository_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `research_papers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `template_id` int NOT NULL,
  `title` varchar(500) NOT NULL,
  `status` enum('DRAFT','IN_PROGRESS','READY_FOR_REVIEW','COMPLETED') NOT NULL DEFAULT 'DRAFT',
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`),
  KEY `idx_research_papers_template` (`template_id`),
  KEY `fk_research_papers_creator` (`created_by`),
  CONSTRAINT `fk_research_papers_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_research_papers_project` FOREIGN KEY (`project_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_research_papers_template` FOREIGN KEY (`template_id`) REFERENCES `paper_templates` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repository_id` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `resource_type` enum('PDF','DOC','DOCX','IMAGE','DATASET','SOURCE_CODE','PAPER','TEMPLATE','LINK','OTHER') NOT NULL DEFAULT 'LINK',
  `resource_url` varchar(2048) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `file_data` longblob,
  `notes` text,
  `visibility` enum('PROJECT','SHARED','PUBLIC') NOT NULL DEFAULT 'PROJECT',
  `uploaded_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resources_repository_type` (`repository_id`,`resource_type`),
  KEY `idx_resources_visibility_created` (`visibility`,`created_at`),
  KEY `fk_resources_uploader` (`uploaded_by`),
  CONSTRAINT `fk_resources_repository` FOREIGN KEY (`repository_id`) REFERENCES `repositories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_resources_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `student_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `enrollment_number` varchar(100) DEFAULT NULL,
  `specialization` varchar(150) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `semester` int DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `research_interests` text,
  `skills` text,
  `bio` text,
  `profile_completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `research_areas` text,
  `previous_projects` text,
  `publications` text,
  `research_experience` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `submission_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `suggestion_id` int DEFAULT NULL,
  `file_path` varchar(512) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `uploaded_by` int NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_path` (`file_path`),
  KEY `idx_submission_files_submission` (`submission_id`,`uploaded_at`),
  KEY `idx_submission_files_suggestion` (`suggestion_id`),
  KEY `fk_submission_files_uploader` (`uploaded_by`),
  CONSTRAINT `fk_submission_files_submission` FOREIGN KEY (`submission_id`) REFERENCES `milestone_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_files_suggestion` FOREIGN KEY (`suggestion_id`) REFERENCES `milestone_suggestions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submission_files_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `submission_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `reviewed_by` int NOT NULL,
  `decision` enum('APPROVED','REVISION_REQUIRED','REJECTED') NOT NULL,
  `feedback` text,
  `remarks` text,
  `improvements` text,
  `marks_awarded` decimal(7,2) DEFAULT NULL,
  `marks_visible_to_student` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_submission_reviews_submission` (`submission_id`),
  KEY `fk_submission_reviews_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_submission_reviews_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_reviews_submission` FOREIGN KEY (`submission_id`) REFERENCES `milestone_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `submission_suggestion_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `suggestion_id` int NOT NULL,
  `response` text NOT NULL,
  `status` enum('IN_PROGRESS','ADDRESSED') NOT NULL DEFAULT 'IN_PROGRESS',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_submission_suggestion_response` (`submission_id`,`suggestion_id`),
  KEY `idx_suggestion_responses_suggestion` (`suggestion_id`,`created_at`),
  CONSTRAINT `fk_suggestion_responses_submission` FOREIGN KEY (`submission_id`) REFERENCES `milestone_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_suggestion_responses_suggestion` FOREIGN KEY (`suggestion_id`) REFERENCES `milestone_suggestions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `milestone_id` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `deadline` datetime NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `status` enum('TODO','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'TODO',
  `progress_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_milestone_deadline` (`milestone_id`,`deadline`),
  KEY `idx_tasks_assignee_status` (`assigned_to`,`status`),
  KEY `fk_tasks_creator` (`created_by`),
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','faculty') NOT NULL,
  `institution` varchar(150) NOT NULL,
  `course` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verification_token_hash` char(64) DEFAULT NULL,
  `email_verification_expires_at` datetime DEFAULT NULL,
  `email_verification_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

