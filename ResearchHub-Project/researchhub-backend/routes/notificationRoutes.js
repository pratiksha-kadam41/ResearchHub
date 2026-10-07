const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authMiddleware, authorize("student", "faculty"), listNotifications);
router.patch("/read-all", authMiddleware, authorize("student", "faculty"), markAllNotificationsRead);
router.patch("/:notificationId/read", authMiddleware, authorize("student", "faculty"), markNotificationRead);

module.exports = router;
