USE researchhub;

-- Backfill in-app notifications for any pending invitations
-- that existed before the notification system was added.
INSERT INTO notifications (user_id, type, title, message, link_url)
SELECT
    u.id,
    'REPOSITORY_INVITATION',
    CONCAT('Invitation to join "', r.name, '"'),
    CONCAT(inviter.name, ' invited you to join the research repository "', r.name, '". Open your dashboard to accept or reject.'),
    '/dashboard/student'
FROM repository_invitations ri
JOIN repositories  r       ON r.id       = ri.repository_id
JOIN users         u       ON u.email    = ri.email
JOIN users         inviter ON inviter.id = ri.inviter_id
WHERE ri.response_status = 'pending'
  AND ri.expires_at > UTC_TIMESTAMP()
  AND u.role = 'student'
  AND NOT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.user_id = u.id
        AND n.type    = 'REPOSITORY_INVITATION'
  );
