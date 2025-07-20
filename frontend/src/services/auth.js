import { apiService } from "./api";

export const authService = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await apiService.post("/auth/login", {
        email,
        password,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await apiService.post("/auth/register", userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: async (refreshToken) => {
    // Added refreshToken parameter
    try {
      if (refreshToken) {
        await apiService.post("/auth/logout", { refreshToken });
      } else {
        console.warn("No refresh token found for logout.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear tokens locally
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  },

  // Get current user data
  getCurrentUser: async () => {
    try {
      const response = await apiService.get("/auth/profile"); // Corrected endpoint from /auth/me to /auth/profile
      return response.data.user; // Access user from response.data.user
    } catch (error) {
      throw error;
    }
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    try {
      const response = await apiService.post("/auth/refresh", {
        refreshToken,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await apiService.put("/auth/profile", userData);
      return response.data.user;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await apiService.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Forgot password (Assuming these endpoints exist on backend based on previous context)
  forgotPassword: async (email) => {
    try {
      const response = await apiService.post("/auth/forgot-password", {
        email,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reset password (Assuming these endpoints exist on backend based on previous context)
  resetPassword: async (token, newPassword) => {
    try {
      const response = await apiService.post("/auth/reset-password", {
        token,
        newPassword,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Verify email (Assuming these endpoints exist on backend based on previous context)
  verifyEmail: async (token) => {
    try {
      const response = await apiService.post("/auth/verify-email", {
        token,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Resend verification email (Assuming these endpoints exist on backend based on previous context)
  resendVerification: async (email) => {
    try {
      const response = await apiService.post("/auth/resend-verification", {
        email,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};
