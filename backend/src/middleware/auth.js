// backend/src/middleware/auth.js

import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Auth: No token provided or invalid format.");
      return res.status(401).json({
        error: "Access denied",
        message: "No token provided or invalid token format",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    console.log(
      "Auth: Token received:",
      token ? token.substring(0, 30) + "..." : "none"
    ); // Log first 30 chars

    try {
      const decoded = verifyAccessToken(token);
      console.log("Auth: Token decoded:", decoded);

      const user = await User.findById(decoded.userId);
      if (!user) {
        console.log("Auth: User not found for decoded token.");
        return res.status(401).json({
          error: "Access denied",
          message: "User not found",
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };
      console.log("Auth: User authenticated:", req.user.email);
      next();
    } catch (tokenError) {
      console.error("Auth: Token verification failed:", tokenError.message);
      return res.status(401).json({
        error: "Access denied",
        message: "Invalid or expired token", // This is the message you're seeing
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
