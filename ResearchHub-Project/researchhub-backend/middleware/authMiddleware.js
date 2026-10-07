const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/security");

const authMiddleware = (req, res, next) => {
  // ==========================================
  // 1. Get Authorization header
  // ==========================================

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  // ==========================================
  // 2. Check Bearer format
  // ==========================================

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      message: "Invalid authentication format",
    });
  }

  const token = parts[1];

  // ==========================================
  // 3. Verify JWT
  // ==========================================

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // ==========================================
    // 4. Store decoded user information
    // ==========================================

    req.user = decoded;

    // ==========================================
    // 5. Continue to next function
    // ==========================================

    next();
  } catch (error) {
    if (error.code === "AUTH_CONFIGURATION_ERROR") {
      console.error("Authentication configuration error:", error.message);
      return res.status(500).json({
        message: "Authentication is not configured on this server.",
      });
    }

    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};

module.exports = authMiddleware;
