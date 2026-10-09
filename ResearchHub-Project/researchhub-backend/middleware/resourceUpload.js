const multer = require("multer");
const path = require("node:path");

const allowedExtensions = new Set([
  ".csv", ".doc", ".docx", ".jpeg", ".jpg", ".pdf", ".png",
  ".ppt", ".pptx", ".txt", ".xls", ".xlsx", ".zip",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new Error("Upload a PDF, Office document, image, CSV, text, or ZIP file."));
      return;
    }
    callback(null, true);
  },
});

const uploadResourceFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      req.body = req.body || {};
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(422).json({ message: error.message || "Unable to upload resource file." });
  });
};

module.exports = { uploadResourceFile };
