const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createTask,
  deleteTask,
  listRepositoryTasks,
  updateTaskByFaculty,
  updateTaskProgress,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryTasks);
router.post("/milestone/:milestoneId", authMiddleware, authorize("faculty"), createTask);
router.patch("/:taskId", authMiddleware, authorize("faculty"), updateTaskByFaculty);
router.patch("/:taskId/progress", authMiddleware, authorize("student"), updateTaskProgress);
router.delete("/:taskId", authMiddleware, authorize("faculty"), deleteTask);

module.exports = router;
