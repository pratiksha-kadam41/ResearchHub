const jwt = require("jsonwebtoken");

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "researchhub_secret_key",
    );

    // ==========================================
    // 4. Store decoded user information
    // ==========================================

    req.user = decoded;

    // ==========================================
    // 5. Continue to next function
    // ==========================================

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};

module.exports = authMiddleware;
