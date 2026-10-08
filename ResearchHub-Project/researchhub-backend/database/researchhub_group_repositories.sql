USE researchhub;

CREATE TABLE IF NOT EXISTS repository_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    user_id INT NOT NULL,
    member_role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_repository_member (repository_id, user_id),
    INDEX idx_repository_members_user (user_id),
    CONSTRAINT fk_repository_members_repository
        FOREIGN KEY (repository_id)
        REFERENCES repositories(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_repository_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repository_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    inviter_id INT NOT NULL,
    email VARCHAR(150) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    delivery_status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    response_status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    responded_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_repository_invitation (repository_id, email),
    INDEX idx_repository_invitations_token (token_hash),
    INDEX idx_repository_invitations_inviter (inviter_id),
    CONSTRAINT fk_repository_invitations_repository
        FOREIGN KEY (repository_id)
        REFERENCES repositories(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_repository_invitations_inviter
        FOREIGN KEY (inviter_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

UPDATE repository_invitations
SET response_status = 'accepted',
    responded_at = COALESCE(responded_at, accepted_at)
WHERE accepted_at IS NOT NULL AND response_status = 'pending';

CREATE TABLE IF NOT EXISTS repository_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_repository_documents_repository (repository_id),
    CONSTRAINT fk_repository_documents_repository
        FOREIGN KEY (repository_id)
        REFERENCES repositories(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_repository_documents_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_repository_documents_updater
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

INSERT IGNORE INTO repository_members (repository_id, user_id, member_role)
SELECT id, owner_id, 'owner'
FROM repositories;
