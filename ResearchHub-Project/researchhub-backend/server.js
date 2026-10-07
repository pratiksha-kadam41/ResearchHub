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

const app = express();

app.use(cors());

// This MUST come before the routes
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/repositories", repositoryRoutes);

app.get("/", (req, res) => {
  res.send("ResearchHub Backend is running!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ResearchHub Backend running on port ${PORT}`);
});
