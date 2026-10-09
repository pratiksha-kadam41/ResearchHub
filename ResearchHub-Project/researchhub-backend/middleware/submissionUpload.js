const multer = require("multer");
const path = require("node:path");

const allowedExtensions = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".txt",
  ".xls",
  ".xlsx",
  ".zip",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new Error("Upload a PDF, Office document, image, CSV, text, or ZIP file."));
      return;
    }
    callback(null, true);
  },
});

const uploadSubmissionFiles = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(422).json({ message: error.message || "Unable to upload submission files." });
  });
};

module.exports = { uploadSubmissionFiles };
