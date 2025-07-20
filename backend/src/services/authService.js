// backend/src/services/authService.js

import { User } from "../models/User.js";
import {
  generateTokens,
  generateAccessTokenFromRefresh,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { executeQuery } from "../config/database.js";
import { logger } from "../utils/logger.js";

export class AuthService {
  // Register new user
  static async register(userData) {
    const { name, email, password } = userData;
    logger.info("AuthService: Registering user", { email });

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

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
      user: user.toSafeObject(),
      token: accessToken,
      refreshToken: refreshToken,
    };
  }

  // Login user
  static async login(credentials) {
    const { email, password } = credentials;
    logger.info("AuthService: User login attempt", { email });

    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email);
    logger.debug("AuthService: Generated tokens during login", {
      accessToken: accessToken.substring(0, 20) + "...",
      refreshToken: refreshToken.substring(0, 20) + "...",
    });

    // Invalidate old refresh tokens and store new one
    await this.deleteRefreshTokensForUser(user.id);
    await this.storeRefreshToken(user.id, refreshToken);
    logger.debug("AuthService: Stored refresh token for logged in user", {
      userId: user.id,
    });

    return {
      user: user.toSafeObject(),
      token: accessToken,
      refreshToken: refreshToken,
    };
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    logger.info("AuthService: Refresh token request received", {
      refreshToken: refreshToken
        ? refreshToken.substring(0, 20) + "..."
        : "none",
    });
    try {
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

      const user = await User.findById(decodedRefresh.userId);
      if (!user) {
        logger.warn("AuthService: User not found for refresh token.");
        await this.deleteRefreshToken(refreshToken);
        throw new Error("Invalid refresh token");
      }

      const newAccessToken = generateAccessTokenFromRefresh(refreshToken);
      logger.debug("AuthService: New access token generated from refresh.", {
        newAccessToken: newAccessToken.substring(0, 20) + "...",
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error("AuthService: Refresh token process failed:", error.message);
      if (
        error.message.includes("Invalid refresh token") ||
        error.name === "TokenExpiredError"
      ) {
        await this.deleteRefreshToken(refreshToken);
      }
      throw new Error("Invalid or expired refresh token");
    }
  }

  // Store refresh token in database
  static async storeRefreshToken(userId, token) {
    // Ensure JWT_REFRESH_EXPIRES_IN_MS is a valid number, default to 7 days if not set or invalid
    const expiresInMs = parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_MS || "604800000"
    ); // Default to 7 days
    if (isNaN(expiresInMs) || expiresInMs <= 0) {
      logger.warn(
        `Invalid JWT_REFRESH_EXPIRES_IN_MS environment variable: ${process.env.JWT_REFRESH_EXPIRES_IN_MS}. Defaulting to 7 days.`
      );
      expiresInMs = 604800000;
    }

    const expiresAt = new Date(Date.now() + expiresInMs);
    const query =
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)";
    await executeQuery(query, [userId, token, expiresAt]);
  }

  // Get refresh token from database
  static async getRefreshToken(token) {
    const query =
      "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()";
    const rows = await executeQuery(query, [token]);
    return rows.length > 0 ? rows[0] : null;
  }

  // Delete a specific refresh token from database
  static async deleteRefreshToken(token) {
    const query = "DELETE FROM refresh_tokens WHERE token = ?";
    await executeQuery(query, [token]);
  }

  // Delete all refresh tokens for a user (e.g., on logout or password change)
  static async deleteRefreshTokensForUser(userId) {
    const query = "DELETE FROM refresh_tokens WHERE user_id = ?";
    await executeQuery(query, [userId]);
  }

  // Logout user
  static async logout(refreshToken) {
    logger.info("AuthService: User logout attempt");
    if (!refreshToken) {
      logger.warn("Logout called without a refresh token.");
      return { message: "No refresh token provided." };
    }

    try {
      await this.deleteRefreshToken(refreshToken);
      logger.info("Refresh token deleted during logout.");
      return { message: "Successfully logged out." };
    } catch (error) {
      logger.error("Error deleting refresh token during logout:", error);
      throw new Error("Failed to logout due to token issue.");
    }
  }
}
