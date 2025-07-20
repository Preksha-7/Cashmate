/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}", // Scan for Tailwind classes in src/
    "./*.html",
  ],
  theme: {
    extend: {
      colors: {
        // Inspired by Neon Rain website: Deep, sophisticated blues and purples with vibrant accents
        primary: {
          50: "#e0f2f7", // Very light for subtle highlights on dark background
          100: "#b3e0ed",
          200: "#80cbe4",
          300: "#4db8d8",
          400: "#26a2c0",
          500: "#0088A8", // Main vibrant electric blue (primary accent)
          600: "#007A99",
          700: "#006B8A",
          800: "#005C7A",
          900: "#0A122A", // Very dark blue/almost black for main backgrounds
        },
        // Bright neon green for success elements
        success: {
          50: "#e6ffe6",
          100: "#ccffcc",
          200: "#99ff99",
          300: "#66ff66",
          400: "#33ff33",
          500: "#00E600", // Bright neon green (success accent)
          600: "#00CC00",
          700: "#00B300",
          800: "#009900",
          900: "#006600",
        },
        // Vivid neon pink/magenta for danger or strong accents
        danger: {
          50: "#ffe6f2",
          100: "#ffcced",
          200: "#ff99db",
          300: "#ff66c9",
          400: "#ff33b6",
          500: "#FF0099", // Vivid neon pink/magenta (danger accent)
          600: "#E6008A",
          700: "#CC007A",
          800: "#B3006B",
          900: "#80004C",
        },
        // Neutral grays for text, borders, and subtle elements on dark backgrounds
        gray: {
          50: "#F5F5F5",
          100: "#E0E0E0",
          200: "#CCCCCC",
          300: "#B0B0B0",
          400: "#909090",
          500: "#707070",
          600: "#505050",
          700: "#303030",
          800: "#1A1A1A",
          900: "#0A0A0A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
