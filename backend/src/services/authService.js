// backend/src/services/authService.js

import { User } from "../models/User.js";
import {
  generateTokens,
  generateAccessTokenFromRefresh,
  verifyAccessToken, // Added for refresh token verification debug
  verifyRefreshToken, // Added for refresh token verification debug
} from "../utils/jwt.js";
import { executeQuery } from "../config/database.js";
import { logger } from "../utils/logger.js"; // Import logger

export class AuthService {
  // Register new user
  static async register(userData) {
    // ... existing code ...
    logger.info("AuthService: Registering user", { email });
    const userId = await User.create({ name, email, password });
    const user = await User.findById(userId);

    const { accessToken, refreshToken } = generateTokens(user.id, user.email);
    logger.debug("AuthService: Generated tokens during registration", {
      accessToken: accessToken.substring(0, 20) + "...",
      refreshToken: refreshToken.substring(0, 20) + "...",
    });

    await this.storeRefreshToken(user.id, refreshToken);
    logger.debug("AuthService: Stored refresh token for new user", {
      userId: user.id,
    });

    return {
      /* ... */
    };
  }

  // Login user
  static async login(credentials) {
    // ... existing code ...
    logger.info("AuthService: User login attempt", { email });
    const user = await User.findByEmail(email);
    // ... password verification ...

    const { accessToken, refreshToken } = generateTokens(user.id, user.email);
    logger.debug("AuthService: Generated tokens during login", {
      accessToken: accessToken.substring(0, 20) + "...",
      refreshToken: refreshToken.substring(0, 20) + "...",
    });

    await this.storeRefreshToken(user.id, refreshToken);
    logger.debug("AuthService: Stored refresh token for logged in user", {
      userId: user.id,
    });

    return {
      /* ... */
    };
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    logger.info("AuthService: Refresh token request received", {
      refreshToken: refreshToken.substring(0, 20) + "...",
    });
    try {
      // Verify refresh token itself before checking DB to catch immediate failures
      const decodedRefresh = verifyRefreshToken(refreshToken);
      logger.debug("AuthService: Refresh token decoded by JWT utility.", {
        decodedUserId: decodedRefresh.userId,
      });

      const tokenRecord = await this.getRefreshToken(refreshToken);
      if (!tokenRecord) {
        logger.warn(
          "AuthService: Refresh token not found in DB or expired in DB."
        );
        throw new Error("Invalid refresh token");
      }
      logger.debug("AuthService: Refresh token found in DB.");

      const newAccessToken = generateAccessTokenFromRefresh(refreshToken);
      logger.debug("AuthService: New access token generated from refresh.", {
        newAccessToken: newAccessToken.substring(0, 20) + "...",
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error("AuthService: Refresh token process failed:", error.message);
      throw new Error("Invalid or expired refresh token");
    }
  }

  // ... rest of your methods ...
}
