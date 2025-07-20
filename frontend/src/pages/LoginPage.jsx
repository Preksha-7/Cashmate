// File: frontend/src/pages/LoginPage.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom"; // Keep Link for navigation
import { useAuth } from "../hooks/useAuth"; // Assuming useAuth is correctly imported from hooks

// Your original LoginPage.jsx already contains the main logic for handling both login and register forms
// This component is robust and correctly uses useAuth.
// The previous changes to Login.jsx and Register.jsx were more about consistent styling of individual forms.
// Since LoginPage.jsx combines them, you just need to ensure the nested Login and Register components (if separate)
// use the new consistent styling classes.

const LoginPage = () => {
  const [formData, setFormData] = useState({
    name: "", // Keep name for register mode
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false); // This state correctly determines which form to show

  const { login, register, loading } = useAuth(); // Correctly using useAuth hook

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister) {
      if (!formData.name || !formData.email || !formData.password) {
        setError("All fields are required");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    } else {
      // Login mode validation
      if (!formData.email || !formData.password) {
        setError("Both email and password are required.");
        return;
      }
    }

    const result = isRegister
      ? await register(formData) // This calls the register function from useAuth
      : await login(formData.email, formData.password); // This calls the login function from useAuth

    if (!result.success) {
      setError(result.error);
    }
    // No explicit navigation here, as useAuth context likely handles redirect on success
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setFormData({
      email: "",
      password: "",
      name: "", // Clear name when toggling mode
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isRegister ? "Create your account" : "Welcome to CashMate"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRegister
              ? "Start tracking your finances today"
              : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger-50 border border-danger-200 rounded-md p-3">
                <p className="text-sm text-danger-800">{error}</p>
              </div>
            )}

            {isRegister && (
              <div>
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={isRegister}
                  className="form-input" // Applying consistent style
                  placeholder="Enter your full name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input" // Applying consistent style
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="form-input pr-10" // Applying consistent style
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 text-base"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isRegister ? "Creating Account..." : "Signing In..."}
                  </div>
                ) : isRegister ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                {isRegister
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
