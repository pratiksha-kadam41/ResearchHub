const express = require("express");
const cors = require("cors");
const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const repositoryRoutes = require("./routes/repositoryRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const mentorRequestRoutes = require("./routes/mentorRequestRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const taskRoutes = require("./routes/taskRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const researchPaperRoutes = require("./routes/researchPaperRoutes");
const { sendUpcomingMilestoneReminders } = require("./services/milestoneDeadlineReminders");

const app = express();

app.use(cors());

// This MUST come before the routes
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/mentor-requests", mentorRequestRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/research-papers", researchPaperRoutes);
app.use("/api/repositories", repositoryRoutes);

app.get("/", (req, res) => {
  res.send("ResearchHub Backend is running!");
});

app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const databaseConnectionError = [
    "ER_ACCESS_DENIED_ERROR",
    "ECONNREFUSED",
    "ENOTFOUND",
  ].includes(error.code);

  console.error("Unhandled API error:", {
    method: req.method,
    path: req.path,
    code: error.code || "UNKNOWN",
    message: error.message,
  });

  return res.status(databaseConnectionError ? 503 : 500).json({
    message: databaseConnectionError
      ? "The database connection failed. Check DB_HOST, DB_USER, and DB_PASSWORD in the backend .env file, then restart the backend."
      : "The server could not complete this request. Check the backend logs for details.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ResearchHub Backend running on port ${PORT}`);
  const runMilestoneDeadlineReminders = () => {
    sendUpcomingMilestoneReminders().catch((error) => {
      console.error("Milestone deadline reminders failed:", error);
    });
  };
  runMilestoneDeadlineReminders();
  const reminderTimer = setInterval(runMilestoneDeadlineReminders, 60 * 60 * 1000);
  reminderTimer.unref();
});
