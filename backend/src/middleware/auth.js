// backend/src/middleware/auth.js
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied",
        message: "No token provided or invalid token format",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = verifyAccessToken(token);

      // Verify user still exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          error: "Access denied",
          message: "User not found",
        });
      }

      // Add user info to request object
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (tokenError) {
      return res.status(401).json({
        error: "Access denied",
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Authentication failed",
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      req.user = user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        : null;
    } catch (tokenError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    req.user = null;
    next();
  }
};
