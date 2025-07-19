import { AuthService } from "../services/authService.js";
import { User } from "../models/User.js";

export class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (error.message === "User already exists with this email") {
        return res.status(409).json({
          success: false,
          error: "User already exists",
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Registration failed",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const result = await AuthService.login(req.body);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "Invalid email or password") {
        return res.status(401).json({
          success: false,
          error: "Authentication failed",
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Login failed",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Token refresh error:", error);

      res.status(401).json({
        success: false,
        error: "Token refresh failed",
        message: error.message,
      });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.logout(refreshToken);

      res.json({
        success: true,
        message: "Logged out successfully",
        data: result,
      });
    } catch (error) {
      console.error("Logout error:", error);

      res.status(500).json({
        success: false,
        error: "Logout failed",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      res.json({
        success: true,
        message: "Profile retrieved successfully",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to get profile",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const updatedUser = await User.update(req.user.id, { name, email });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: updatedUser.toSafeObject(),
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);

      if (
        error.message.includes("Duplicate entry") &&
        error.message.includes("email")
      ) {
        return res.status(409).json({
          success: false,
          error: "Email already exists",
          message: "This email is already registered with another account",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await User.findById(req.user.id);
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: "Invalid current password",
          message: "The current password you entered is incorrect",
        });
      }

      // Update password
      await User.update(req.user.id, { password: newPassword });

      res.json({
        success: true,
        message: "Password changed successfully",
        data: null,
      });
    } catch (error) {
      console.error("Change password error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to change password",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
}
