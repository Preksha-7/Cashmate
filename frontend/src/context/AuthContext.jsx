import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth";

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        // Only try to fetch user if a token exists
        if (token) {
          // Verify the token immediately by trying to get the current user
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Clear tokens if initialization fails (e.g., token expired or invalid)
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []); // Empty dependency array means this runs once on mount

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);

      // Store tokens
      localStorage.setItem("token", response.data.token); // Access response.data.token
      if (response.data.refreshToken) {
        // Access response.data.refreshToken
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }

      // Set user data
      setUser(response.data.user); // Access response.data.user
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);

      // Auto login after registration
      localStorage.setItem("token", response.data.token); // Access response.data.token
      if (response.data.refreshToken) {
        // Access response.data.refreshToken
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }

      setUser(response.data.user); // Access response.data.user
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Ensure refresh token is sent with logout request
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await authService.logout(refreshToken); // Pass refreshToken to logout service
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (updatedData) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedData }));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
