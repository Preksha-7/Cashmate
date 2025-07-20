import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "投" },
    { name: "Transactions", href: "/transactions", icon: "腸" },
    { name: "Upload", href: "/upload", icon: "豆" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleProfileSettings = () => {
    navigate("/settings"); // Navigate to a dedicated settings page
    setIsUserMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-primary-900 shadow-lg border-b border-gray-800">
      {" "}
      {/* Darker header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                {" "}
                {/* Vibrant primary accent */}
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-gray-100 text-xl font-bold">CashMate</span>{" "}
              {/* Light text on dark header */}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary-700 text-primary-50" // Brighter active state
                    : "text-gray-300 hover:text-white hover:bg-primary-800" // Lighter text on hover
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-md text-sm text-gray-300 hover:text-white hover:bg-primary-800"
              >
                <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
                  <span className="text-primary-50 font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden lg:block">{user?.name || "User"}</span>
                <svg
                  className={`w-4 h-4 text-gray-300 transition-transform ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-700">
                  {" "}
                  {/* Darker dropdown */}
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm font-medium text-gray-100">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleProfileSettings}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <svg
                className="block h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={
                    isMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-primary-800 border-t border-gray-800">
            {" "}
            {/* Darker mobile menu */}
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? "bg-primary-700 text-primary-50" // Brighter active state
                    : "text-gray-300 hover:text-white hover:bg-primary-700" // Lighter text on hover
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
            {/* Mobile User Section */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center px-3 py-2">
                <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center mr-3">
                  <span className="text-primary-50 font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <div className="text-base font-medium text-gray-100">
                    {user?.name}
                  </div>
                  <div className="text-sm text-gray-400">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={handleProfileSettings}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-primary-700"
              >
                Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-primary-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
