USE researchhub;

ALTER TABLE repository_invitations
    ADD COLUMN response_status ENUM('pending', 'accepted', 'rejected')
        NOT NULL DEFAULT 'pending',
    ADD COLUMN responded_at DATETIME NULL;

UPDATE repository_invitations
SET response_status = 'accepted',
    responded_at = COALESCE(responded_at, accepted_at)
WHERE accepted_at IS NOT NULL;
