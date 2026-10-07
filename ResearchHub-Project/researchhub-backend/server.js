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
app.use("/api/repositories", repositoryRoutes);

app.get("/", (req, res) => {
  res.send("ResearchHub Backend is running!");
});

app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ResearchHub Backend running on port ${PORT}`);
});
