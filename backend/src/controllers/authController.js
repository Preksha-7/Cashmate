// backend/src/controllers/authController.js
import { AuthService } from "../services/authService.js";

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
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            created_at: updatedUser.created_at,
            updated_at: updatedUser.updated_at,
          },
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);

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
}
