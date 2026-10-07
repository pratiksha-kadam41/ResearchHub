const db = require("../config/db");
const { parsePositiveId } = require("../services/repositoryAccess");

const listNotifications = async (req, res) => {
  try {
    const [notifications] = await db.promise().execute(
      `SELECT id, type, title, message, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY is_read ASC, created_at DESC, id DESC
       LIMIT 100`,
      [req.user.id],
    );
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Notification list failed:", error);
    return res.status(500).json({ message: "Unable to load notifications." });
  }
};

const markNotificationRead = async (req, res) => {
  const notificationId = parsePositiveId(req.params.notificationId);
  if (!notificationId) return res.status(400).json({ message: "Invalid notification ID." });
  try {
    const [result] = await db.promise().execute(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notificationId, req.user.id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Notification not found." });
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Notification update failed:", error);
    return res.status(500).json({ message: "Unable to update notification." });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await db.promise().execute("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE", [req.user.id]);
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Notification bulk update failed:", error);
    return res.status(500).json({ message: "Unable to update notifications." });
  }
};

module.exports = { listNotifications, markAllNotificationsRead, markNotificationRead };
