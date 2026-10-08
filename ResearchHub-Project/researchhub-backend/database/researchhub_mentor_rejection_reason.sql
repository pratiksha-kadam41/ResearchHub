USE researchhub;

ALTER TABLE mentor_requests
    ADD COLUMN rejection_reason TEXT NULL;
