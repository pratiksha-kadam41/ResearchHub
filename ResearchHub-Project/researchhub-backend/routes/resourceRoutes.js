const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createResource,
  deleteResource,
  listRepositoryResources,
  listSharedResources,
  updateResource,
} = require("../controllers/resourceController");

const router = express.Router();

router.get("/library", authMiddleware, authorize("student", "faculty"), listSharedResources);
router.get("/repository/:repositoryId", authMiddleware, authorize("student", "faculty"), listRepositoryResources);
router.post("/", authMiddleware, authorize("student", "faculty"), createResource);
router.patch("/:resourceId", authMiddleware, authorize("student", "faculty"), updateResource);
router.delete("/:resourceId", authMiddleware, authorize("student", "faculty"), deleteResource);

module.exports = router;
