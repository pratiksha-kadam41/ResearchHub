const db = require("../config/db");

const execute = (connection, sql, bindings) =>
  typeof connection.promise === "function"
    ? connection.promise().execute(sql, bindings)
    : connection.execute(sql, bindings);

const parsePositiveId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getRepositoryMembership = async (repositoryId, userId, connection = db) => {
  const id = parsePositiveId(repositoryId);
  if (!id) return null;

  const [rows] = await execute(
    connection,
    `SELECT r.id, r.name, r.owner_id, r.privacy, r.status, rm.member_role
     FROM repositories r
     INNER JOIN repository_members rm ON rm.repository_id = r.id
     WHERE r.id = ? AND rm.user_id = ?`,
    [id, userId],
  );

  return rows[0] || null;
};

const getRepositoryMentorship = async (repositoryId, facultyId, connection = db) => {
  const id = parsePositiveId(repositoryId);
  if (!id) return null;

  const [rows] = await execute(
    connection,
    `SELECT id, repository_id
     FROM mentor_requests
     WHERE repository_id = ? AND faculty_id = ? AND status = 'ACCEPTED'
     LIMIT 1`,
    [id, facultyId],
  );

  return rows[0] || null;
};

const getRepositoryMemberIds = async (repositoryId, connection = db) => {
  const [rows] = await execute(
    connection,
    "SELECT user_id FROM repository_members WHERE repository_id = ?",
    [repositoryId],
  );
  return rows.map((row) => row.user_id);
};

const createNotifications = async (userIds, notification, connection = db) => {
  const uniqueUserIds = [...new Set(userIds)].filter((id) => Number.isSafeInteger(id));
  if (uniqueUserIds.length === 0) return;

  const values = uniqueUserIds.map(() => "(?, ?, ?, ?, ?)").join(", ");
  const bindings = uniqueUserIds.flatMap((userId) => [
    userId,
    notification.type,
    notification.title,
    notification.message,
    notification.linkUrl || null,
  ]);

  await execute(
    connection,
    `INSERT INTO notifications (user_id, type, title, message, link_url)
     VALUES ${values}`,
    bindings,
  );
};

module.exports = {
  createNotifications,
  getRepositoryMemberIds,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
};
