USE researchhub;

-- List student accounts and their IDs before creating a repository manually.
SELECT
    id AS student_id,
    name,
    email
FROM users
WHERE role = 'student'
ORDER BY name;

-- View repository information together with the owning student's account ID.
SELECT
    r.id AS repository_id,
    r.name,
    r.description,
    r.domain,
    r.research_type,
    r.privacy,
    r.status,
    r.owner_id AS student_id,
    u.name AS student_name,
    u.email AS student_email,
    r.created_at
FROM repositories AS r
INNER JOIN users AS u
    ON u.id = r.owner_id
   AND u.role = 'student'
ORDER BY r.created_at DESC, r.id DESC;

-- Replace 1 with the ID of the student whose dashboard you want to inspect.
SET @student_id = 1;

-- List only repositories created by or accepted by this student.
SELECT
    r.id AS repository_id,
    r.name AS repository_name,
    r.research_type,
    r.status,
    r.privacy,
    r.owner_id,
    CASE
        WHEN r.owner_id = @student_id THEN 'owner'
        ELSE membership.member_role
    END AS this_student_role,
    GROUP_CONCAT(
        DISTINCT member.name
        ORDER BY member.name
        SEPARATOR ', '
    ) AS group_member_names,
    COUNT(DISTINCT member.id) AS member_count
FROM repository_members AS membership
INNER JOIN repositories AS r
    ON r.id = membership.repository_id
INNER JOIN repository_members AS all_members
    ON all_members.repository_id = r.id
INNER JOIN users AS member
    ON member.id = all_members.user_id
   AND member.role = 'student'
WHERE membership.user_id = @student_id
GROUP BY
    r.id,
    r.name,
    r.research_type,
    r.status,
    r.privacy,
    r.owner_id,
    membership.member_role
ORDER BY r.created_at DESC, r.id DESC;

-- Check that repository owners are also recorded as repository members.
SELECT
    r.id AS repository_id,
    r.name AS repository_name,
    r.owner_id AS student_id,
    u.name AS student_name,
    rm.member_role
FROM repositories AS r
INNER JOIN users AS u
    ON u.id = r.owner_id
   AND u.role = 'student'
LEFT JOIN repository_members AS rm
    ON rm.repository_id = r.id
   AND rm.user_id = r.owner_id
ORDER BY r.id DESC;

-- View accepted student members of each repository.
SELECT
    r.id AS repository_id,
    r.name AS repository_name,
    u.id AS student_id,
    u.name AS student_name,
    u.email AS student_email,
    rm.member_role,
    rm.joined_at
FROM repository_members AS rm
INNER JOIN repositories AS r
    ON r.id = rm.repository_id
INNER JOIN users AS u
    ON u.id = rm.user_id
   AND u.role = 'student'
ORDER BY r.id DESC, rm.joined_at, u.name;

-- View pending invitations for group repositories.
SELECT
    ri.id AS invitation_id,
    r.id AS repository_id,
    r.name AS repository_name,
    ri.email AS invited_email,
    ri.delivery_status,
    ri.expires_at,
    ri.created_at
FROM repository_invitations AS ri
INNER JOIN repositories AS r
    ON r.id = ri.repository_id
WHERE r.research_type = 'group'
  AND ri.accepted_at IS NULL
ORDER BY ri.created_at DESC;
