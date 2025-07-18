// backend/src/services/authService.js
import { User } from "../models/User.js";
import {
  generateTokens,
  generateAccessTokenFromRefresh,
} from "../utils/jwt.js";
import { executeQuery } from "../config/database.js";

export class AuthService {
  // Register new user
  static async register(userData) {
    const { name, email, password } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Create new user
    const userId = await User.create({ name, email, password });
    const user = await User.findById(userId);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    // Store refresh token in database (optional - for token invalidation)
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  // Login user
  static async login(credentials) {
    const { email, password } = credentials;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token exists in database
      const tokenRecord = await this.getRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new Error("Invalid refresh token");
      }

      // Generate new access token
      const newAccessToken = generateAccessTokenFromRefresh(refreshToken);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  // Logout user
  static async logout(refreshToken) {
    if (refreshToken) {
      await this.removeRefreshToken(refreshToken);
    }
    return { message: "Logged out successfully" };
  }

  // Store refresh token in database
  static async storeRefreshToken(userId, refreshToken) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
      ON DUPLICATE KEY UPDATE
      token = VALUES(token),
      expires_at = VALUES(expires_at),
      updated_at = CURRENT_TIMESTAMP
    `;

    await executeQuery(query, [userId, refreshToken]);
  }

  // Get refresh token from database
  static async getRefreshToken(refreshToken) {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = ? AND expires_at > NOW()
    `;

    const results = await executeQuery(query, [refreshToken]);
    return results.length > 0 ? results[0] : null;
  }

  // Remove refresh token from database
  static async removeRefreshToken(refreshToken) {
    const query = "DELETE FROM refresh_tokens WHERE token = ?";
    await executeQuery(query, [refreshToken]);
  }

  // Clean expired refresh tokens
  static async cleanExpiredTokens() {
    const query = "DELETE FROM refresh_tokens WHERE expires_at <= NOW()";
    await executeQuery(query);
  }
}
