import axios from "axios";

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
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
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
    console.error("API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
    });

    const originalRequest = error.config;

    // Handle 429 errors (rate limit) - wait and retry
    if (error.response?.status === 429) {
      console.warn("Rate limit hit, retrying after delay...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      return api(originalRequest);
    }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          localStorage.setItem("token", token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
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
