const db = require("../config/db");
const {
  createNotifications,
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const validFutureDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date <= new Date() ? null : date;
};

const validProgress = (value) => {
  const progress = Number(value);
  return Number.isFinite(progress) && progress >= 0 && progress <= 100 ? progress : null;
};

const getTask = async (taskId) => {
  const [rows] = await db.promise().execute(
    `SELECT t.*, m.repository_id, m.title AS milestone_title
     FROM tasks t
     INNER JOIN milestones m ON m.id = t.milestone_id
     WHERE t.id = ?`,
    [taskId],
  );
  return rows[0] || null;
};

const getMilestone = async (milestoneId) => {
  const [rows] = await db.promise().execute(
    "SELECT id, repository_id, title FROM milestones WHERE id = ?",
    [milestoneId],
  );
  return rows[0] || null;
};

const listRepositoryTasks = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });

  try {
    const access = req.user.role === "student"
      ? await getRepositoryMembership(repositoryId, req.user.id)
      : await getRepositoryMentorship(repositoryId, req.user.id);
    if (!access) return res.status(404).json({ message: "Project not found or you do not have access." });

    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
    const priority = typeof req.query.priority === "string" ? req.query.priority.toUpperCase() : "";
    if ((status && !TASK_STATUSES.includes(status)) || (priority && !PRIORITIES.includes(priority))) {
      return res.status(422).json({ message: "Invalid task filter." });
    }
    const filters = ["m.repository_id = ?"];
    const params = [repositoryId];
    if (status) {
      filters.push("t.status = ?");
      params.push(status);
    }
    if (priority) {
      filters.push("t.priority = ?");
      params.push(priority);
    }
    const [tasks] = await db.promise().execute(
      `SELECT t.*, m.title AS milestone_title,
              assignee.name AS assignee_name,
              CASE WHEN t.deadline < UTC_TIMESTAMP() AND t.status <> 'COMPLETED' THEN TRUE ELSE FALSE END AS is_overdue
       FROM tasks t
       INNER JOIN milestones m ON m.id = t.milestone_id
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       WHERE ${filters.join(" AND ")}
       ORDER BY t.deadline ASC, t.id ASC`,
      params,
    );
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error("Task list failed:", error);
    return res.status(500).json({ message: "Unable to load tasks." });
  }
};

const createTask = async (req, res) => {
  const milestoneId = parsePositiveId(req.params.milestoneId);
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const description = typeof req.body.description === "string" ? req.body.description.trim() || null : null;
  const priority = typeof req.body.priority === "string" ? req.body.priority.toUpperCase() : "MEDIUM";
  const deadline = validFutureDate(req.body.deadline);
  const assignedTo = req.body.assignedTo === null || req.body.assignedTo === undefined
    ? null
    : parsePositiveId(req.body.assignedTo);

  if (!milestoneId || !title || title.length > 180 || (description && description.length > 10000) || !PRIORITIES.includes(priority) || !deadline || (req.body.assignedTo !== null && req.body.assignedTo !== undefined && !assignedTo)) {
    return res.status(422).json({ message: "Please provide valid task details." });
  }

  try {
    const milestone = await getMilestone(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found." });
    if (!(await getRepositoryMentorship(milestone.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can create tasks." });
    }
    if (assignedTo) {
      const [[member]] = await db.promise().execute(
        "SELECT user_id FROM repository_members WHERE repository_id = ? AND user_id = ?",
        [milestone.repository_id, assignedTo],
      );
      if (!member) return res.status(422).json({ message: "Task assignee must be a project member." });
    }
    const [result] = await db.promise().execute(
      `INSERT INTO tasks (milestone_id, title, description, priority, deadline, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [milestoneId, title, description, priority, deadline, assignedTo, req.user.id],
    );
    if (assignedTo) {
      await createNotifications([assignedTo], {
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `${title} was assigned to you for ${milestone.title}.`,
        linkUrl: `/repository/${milestone.repository_id}`,
      });
    }
    return res.status(201).json({ message: "Task created.", taskId: result.insertId });
  } catch (error) {
    console.error("Task creation failed:", error);
    return res.status(500).json({ message: "Unable to create task." });
  }
};

const updateTaskByFaculty = async (req, res) => {
  const taskId = parsePositiveId(req.params.taskId);
  if (!taskId) return res.status(400).json({ message: "Invalid task ID." });
  try {
    const task = await getTask(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    if (!(await getRepositoryMentorship(task.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can update tasks." });
    }
    const title = req.body.title === undefined ? task.title : typeof req.body.title === "string" ? req.body.title.trim() : "";
    const description = req.body.description === undefined
      ? task.description
      : typeof req.body.description === "string" && req.body.description.trim().length <= 10000
        ? req.body.description.trim() || null
        : undefined;
    const priority = req.body.priority === undefined ? task.priority : String(req.body.priority).toUpperCase();
    const deadline = req.body.deadline === undefined ? new Date(task.deadline) : validFutureDate(req.body.deadline);
    const assignedTo = req.body.assignedTo === undefined ? task.assigned_to : req.body.assignedTo === null ? null : parsePositiveId(req.body.assignedTo);
    if (!title || title.length > 180 || description === undefined || !PRIORITIES.includes(priority) || !deadline || (req.body.assignedTo !== undefined && req.body.assignedTo !== null && !assignedTo)) {
      return res.status(422).json({ message: "One or more task fields are invalid." });
    }
    if (assignedTo) {
      const [[member]] = await db.promise().execute(
        "SELECT user_id FROM repository_members WHERE repository_id = ? AND user_id = ?",
        [task.repository_id, assignedTo],
      );
      if (!member) return res.status(422).json({ message: "Task assignee must be a project member." });
    }
    await db.promise().execute(
      "UPDATE tasks SET title = ?, description = ?, priority = ?, deadline = ?, assigned_to = ? WHERE id = ?",
      [title, description, priority, deadline, assignedTo, taskId],
    );
    return res.status(200).json({ message: "Task updated." });
  } catch (error) {
    console.error("Task update failed:", error);
    return res.status(500).json({ message: "Unable to update task." });
  }
};

const updateTaskProgress = async (req, res) => {
  const taskId = parsePositiveId(req.params.taskId);
  const status = typeof req.body.status === "string" ? req.body.status.toUpperCase() : "";
  const progress = req.body.progressPercentage === undefined ? null : validProgress(req.body.progressPercentage);
  if (!taskId || (status && !TASK_STATUSES.includes(status)) || (req.body.progressPercentage !== undefined && progress === null) || (!status && progress === null)) {
    return res.status(422).json({ message: "Provide a valid task status or progress percentage." });
  }
  try {
    const task = await getTask(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    if (!(await getRepositoryMembership(task.repository_id, req.user.id)) || (task.assigned_to && task.assigned_to !== req.user.id)) {
      return res.status(403).json({ message: "You cannot update this task." });
    }
    const resolvedStatus = status || (progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : task.status);
    const resolvedProgress = resolvedStatus === "COMPLETED" ? 100 : progress === null ? Number(task.progress_percentage) : progress;
    await db.promise().execute(
      "UPDATE tasks SET status = ?, progress_percentage = ? WHERE id = ?",
      [resolvedStatus, resolvedProgress, taskId],
    );
    const [[mentor]] = await db.promise().execute(
      "SELECT faculty_id FROM mentor_requests WHERE repository_id = ? AND status = 'ACCEPTED'",
      [task.repository_id],
    );
    if (mentor) {
      await createNotifications([mentor.faculty_id], {
        type: "TASK_PROGRESS_UPDATED",
        title: "Task progress updated",
        message: `${task.title} is now ${resolvedStatus.toLowerCase().replace("_", " ")}.`,
        linkUrl: "/dashboard/faculty",
      });
    }
    return res.status(200).json({ message: "Task progress updated." });
  } catch (error) {
    console.error("Task progress update failed:", error);
    return res.status(500).json({ message: "Unable to update task progress." });
  }
};

const deleteTask = async (req, res) => {
  const taskId = parsePositiveId(req.params.taskId);
  if (!taskId) return res.status(400).json({ message: "Invalid task ID." });
  try {
    const task = await getTask(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    if (!(await getRepositoryMentorship(task.repository_id, req.user.id))) {
      return res.status(403).json({ message: "Only the assigned professor can delete tasks." });
    }
    await db.promise().execute("DELETE FROM tasks WHERE id = ?", [taskId]);
    return res.status(200).json({ message: "Task deleted." });
  } catch (error) {
    console.error("Task deletion failed:", error);
    return res.status(500).json({ message: "Unable to delete task." });
  }
};

module.exports = {
  createTask,
  deleteTask,
  listRepositoryTasks,
  updateTaskByFaculty,
  updateTaskProgress,
};
