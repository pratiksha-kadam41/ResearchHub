const db = require("../config/db");
const {
  getRepositoryMembership,
  getRepositoryMentorship,
  parsePositiveId,
} = require("../services/repositoryAccess");

const RESOURCE_TYPES = ["PDF", "DOC", "DOCX", "IMAGE", "DATASET", "SOURCE_CODE", "PAPER", "TEMPLATE", "LINK", "OTHER"];
const VISIBILITIES = ["PROJECT", "SHARED", "PUBLIC"];

const validUrl = (value) => {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const canAccessRepository = (repositoryId, user) =>
  user.role === "student"
    ? getRepositoryMembership(repositoryId, user.id)
    : getRepositoryMentorship(repositoryId, user.id);

const listRepositoryResources = async (req, res) => {
  const repositoryId = parsePositiveId(req.params.repositoryId);
  if (!repositoryId) return res.status(400).json({ message: "Invalid project ID." });
  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(404).json({ message: "Project not found or you do not have access." });
    }
    const type = typeof req.query.type === "string" ? req.query.type.toUpperCase() : "";
    if (type && !RESOURCE_TYPES.includes(type)) return res.status(422).json({ message: "Invalid resource type." });
    const [resources] = await db.promise().execute(
      `SELECT resource.id, resource.title, resource.resource_type, resource.resource_url,
              resource.notes, resource.visibility, resource.created_at, resource.updated_at,
              uploader.id AS uploaded_by, uploader.name AS uploaded_by_name
       FROM resources resource
       INNER JOIN users uploader ON uploader.id = resource.uploaded_by
       WHERE resource.repository_id = ? ${type ? "AND resource.resource_type = ?" : ""}
       ORDER BY resource.created_at DESC, resource.id DESC`,
      type ? [repositoryId, type] : [repositoryId],
    );
    return res.status(200).json({ resources });
  } catch (error) {
    console.error("Resource list failed:", error);
    return res.status(500).json({ message: "Unable to load resources." });
  }
};

const listSharedResources = async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type.toUpperCase() : "";
  if (type && !RESOURCE_TYPES.includes(type)) return res.status(422).json({ message: "Invalid resource type." });
  try {
    const [resources] = await db.promise().execute(
      `SELECT resource.id, resource.title, resource.resource_type, resource.resource_url,
              resource.notes, resource.visibility, resource.created_at,
              uploader.name AS uploaded_by_name, repository.name AS repository_name
       FROM resources resource
       INNER JOIN users uploader ON uploader.id = resource.uploaded_by
       INNER JOIN repositories repository ON repository.id = resource.repository_id
       WHERE resource.visibility IN ('SHARED', 'PUBLIC') ${type ? "AND resource.resource_type = ?" : ""}
       ORDER BY resource.created_at DESC, resource.id DESC
       LIMIT 100`,
      type ? [type] : [],
    );
    return res.status(200).json({ resources });
  } catch (error) {
    console.error("Shared resource list failed:", error);
    return res.status(500).json({ message: "Unable to load shared resources." });
  }
};

const createResource = async (req, res) => {
  const repositoryId = parsePositiveId(req.body.repositoryId);
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const resourceType = typeof req.body.resourceType === "string" ? req.body.resourceType.toUpperCase() : "LINK";
  const resourceUrl = validUrl(req.body.resourceUrl);
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
  const visibility = typeof req.body.visibility === "string" ? req.body.visibility.toUpperCase() : "PROJECT";
  if (!repositoryId || !title || title.length > 180 || !RESOURCE_TYPES.includes(resourceType) || !resourceUrl || notes.length > 10000 || !VISIBILITIES.includes(visibility)) {
    return res.status(422).json({ message: "Please provide valid resource details." });
  }
  try {
    if (!(await canAccessRepository(repositoryId, req.user))) {
      return res.status(403).json({ message: "You do not have access to this project." });
    }
    const [result] = await db.promise().execute(
      `INSERT INTO resources (repository_id, title, resource_type, resource_url, notes, visibility, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [repositoryId, title, resourceType, resourceUrl, notes || null, visibility, req.user.id],
    );
    return res.status(201).json({ message: "Resource saved.", resourceId: result.insertId });
  } catch (error) {
    console.error("Resource creation failed:", error);
    return res.status(500).json({ message: "Unable to save resource." });
  }
};

const updateResource = async (req, res) => {
  const resourceId = parsePositiveId(req.params.resourceId);
  if (!resourceId) return res.status(400).json({ message: "Invalid resource ID." });
  try {
    const [rows] = await db.promise().execute("SELECT * FROM resources WHERE id = ?", [resourceId]);
    const resource = rows[0];
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    const mentor = req.user.role === "faculty" && await getRepositoryMentorship(resource.repository_id, req.user.id);
    if (resource.uploaded_by !== req.user.id && !mentor) {
      return res.status(403).json({ message: "Only the uploader or assigned professor can update this resource." });
    }
    const title = req.body.title === undefined ? resource.title : typeof req.body.title === "string" ? req.body.title.trim() : "";
    const resourceType = req.body.resourceType === undefined ? resource.resource_type : String(req.body.resourceType).toUpperCase();
    const resourceUrl = req.body.resourceUrl === undefined ? resource.resource_url : validUrl(req.body.resourceUrl);
    const notes = req.body.notes === undefined ? resource.notes : typeof req.body.notes === "string" ? req.body.notes.trim() || null : undefined;
    const visibility = req.body.visibility === undefined ? resource.visibility : String(req.body.visibility).toUpperCase();
    if (!title || title.length > 180 || !RESOURCE_TYPES.includes(resourceType) || !resourceUrl || notes === undefined || (notes && notes.length > 10000) || !VISIBILITIES.includes(visibility)) {
      return res.status(422).json({ message: "One or more resource fields are invalid." });
    }
    await db.promise().execute(
      "UPDATE resources SET title = ?, resource_type = ?, resource_url = ?, notes = ?, visibility = ? WHERE id = ?",
      [title, resourceType, resourceUrl, notes, visibility, resourceId],
    );
    return res.status(200).json({ message: "Resource updated." });
  } catch (error) {
    console.error("Resource update failed:", error);
    return res.status(500).json({ message: "Unable to update resource." });
  }
};

const deleteResource = async (req, res) => {
  const resourceId = parsePositiveId(req.params.resourceId);
  if (!resourceId) return res.status(400).json({ message: "Invalid resource ID." });
  try {
    const [rows] = await db.promise().execute("SELECT repository_id, uploaded_by FROM resources WHERE id = ?", [resourceId]);
    const resource = rows[0];
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    const mentor = req.user.role === "faculty" && await getRepositoryMentorship(resource.repository_id, req.user.id);
    if (resource.uploaded_by !== req.user.id && !mentor) {
      return res.status(403).json({ message: "Only the uploader or assigned professor can delete this resource." });
    }
    await db.promise().execute("DELETE FROM resources WHERE id = ?", [resourceId]);
    return res.status(200).json({ message: "Resource deleted." });
  } catch (error) {
    console.error("Resource deletion failed:", error);
    return res.status(500).json({ message: "Unable to delete resource." });
  }
};

module.exports = {
  createResource,
  deleteResource,
  listRepositoryResources,
  listSharedResources,
  updateResource,
};
