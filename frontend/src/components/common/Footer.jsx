import React from "react";

const Footer = () => {
  return (
    <footer className="bg-primary-900 border-t border-gray-800 py-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} CashMate. All rights reserved.</p>
        <p className="mt-1">
          <a
            href="https://github.com/Preksha-7"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-300"
          >
            Contact Us
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
