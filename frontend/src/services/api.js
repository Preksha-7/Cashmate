import axios from "axios";
import { authService } from "./auth"; // Import authService here to use refreshToken method

// Base API configuration
// Use the proxy when in development, full URL in production
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_BASE_URL
    : "/api"; // This will use the proxy

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add debug logging
    console.log("API Request:", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      // fullURL: `${config.baseURL}${config.url}`, // This can be misleading with proxy
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? "Bearer [token]" : "None",
      }, // Redact token
      params: config.params,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const statusCode = error.response?.status;
    const errorData = error.response?.data;

    console.error("API Error:", {
      status: statusCode,
      statusText: error.response?.statusText,
      url: originalRequest?.url,
      message: error.message,
      data: errorData,
      isRetry: originalRequest._retry, // Log if it's a retry request
    });

    // Handle 429 errors (rate limit) - wait and retry
    if (statusCode === 429) {
      console.warn("Rate limit hit, retrying after delay...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      return api(originalRequest);
    }

    // Handle 401 errors (unauthorized) and specifically TokenExpiredError
    if (
      statusCode === 401 &&
      errorData?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Mark as retried

      if (isRefreshing) {
        // If token is already refreshing, queue the original request
        return new Promise((resolve) => {
          failedQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true; // Set flag to indicate refresh is in progress

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          console.error("No refresh token found. Redirecting to login.");
          // No refresh token, redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        console.log("Attempting to refresh token...");
        // Call authService.refreshToken
        const refreshResponse = await authService.refreshToken(refreshToken);
        const newAccessToken = refreshResponse.accessToken; // Access accessToken directly from refreshResponse

        localStorage.setItem("token", newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken); // Process queued requests
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        processQueue(refreshError); // Reject all queued requests
        // Clear tokens and redirect to login on refresh failure
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Reset refresh flag
      }
    } else if (statusCode === 401 && errorData?.code === "INVALID_TOKEN") {
      console.error("Invalid token. Redirecting to login.");
      // Invalid token (not expired), force logout
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // For any other errors or if 401 was a retry, just reject
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  }
);

// Generic API methods
export const apiService = {
  // GET request
  get: async (endpoint, params = {}) => {
    try {
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request
  post: async (endpoint, data = {}) => {
    try {
      const response = await api.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request
  put: async (endpoint, data = {}) => {
    try {
      const response = await api.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request
  delete: async (endpoint) => {
    try {
      const response = await api.delete(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // File upload
  upload: async (endpoint, formData, onUploadProgress = null) => {
    try {
      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download file
  download: async (endpoint, filename) => {
    try {
      const response = await api.get(endpoint, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
