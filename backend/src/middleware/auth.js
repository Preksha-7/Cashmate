import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { AppError } from "./errorHandler.js"; // Import AppError

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Auth: No token provided or invalid format.");
      // Use AppError for consistent error handling
      return next(
        new AppError("No token provided or invalid token format", 401, true, {
          code: "NO_TOKEN",
        })
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    console.log(
      "Auth: Token received:",
      token ? token.substring(0, 30) + "..." : "none"
    );

    try {
      const decoded = verifyAccessToken(token); // This will now throw specific JWT errors
      console.log("Auth: Token decoded:", decoded);

      const user = await User.findById(decoded.userId);
      if (!user) {
        console.log("Auth: User not found for decoded token.");
        return next(
          new AppError("User not found", 401, true, { code: "USER_NOT_FOUND" })
        );
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
      if (tokenError.name === "TokenExpiredError") {
        return next(
          new AppError("Access token expired", 401, true, {
            code: "TOKEN_EXPIRED",
            details: "Please refresh your token.",
          })
        );
      } else if (tokenError.name === "JsonWebTokenError") {
        return next(
          new AppError("Invalid access token", 401, true, {
            code: "INVALID_TOKEN",
          })
        );
      } else {
        // Catch any other unexpected errors during token verification
        return next(tokenError);
      }
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    next(new AppError("Authentication failed", 500, false, { error }));
  }
};
