const path = require("node:path");

const backendDirectory = path.join(
  __dirname,
  "ResearchHub-Project",
  "researchhub-backend",
);

process.chdir(backendDirectory);
require(path.join(backendDirectory, "server.js"));
