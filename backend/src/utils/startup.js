// backend/src/utils/startup.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StartupManager {
  constructor() {
    this.requiredDirs = [
      path.join(__dirname, "../../uploads"),
      path.join(__dirname, "../../logs"),
      path.join(__dirname, "../../temp"),
    ];
  }

  // Ensure all required directories exist
  async ensureDirectories() {
    console.log("📁 Checking required directories...");

    for (const dir of this.requiredDirs) {
      try {
        await fs.access(dir);
        console.log(`✅ Directory exists: ${path.basename(dir)}`);
      } catch {
        try {
          await fs.mkdir(dir, { recursive: true });
          console.log(`📂 Created directory: ${path.basename(dir)}`);
        } catch (error) {
          console.error(`❌ Failed to create directory ${dir}:`, error.message);
          throw error;
        }
      }
    }
  }

  // Create .gitkeep files to preserve empty directories in git
  async createGitKeepFiles() {
    const gitKeepDirs = [
      path.join(__dirname, "../../uploads"),
      path.join(__dirname, "../../logs"),
    ];

    for (const dir of gitKeepDirs) {
      const gitKeepPath = path.join(dir, ".gitkeep");
      try {
        // Check if .gitkeep already exists
        await fs.access(gitKeepPath);
        // File exists, skip creating it
      } catch {
        try {
          await fs.writeFile(
            gitKeepPath,
            "# This file keeps the directory in git\n"
          );
          console.log(`📝 Created .gitkeep in ${path.basename(dir)}`);
        } catch (error) {
          console.warn(
            `⚠️ Failed to create .gitkeep in ${dir}:`,
            error.message
          );
        }
      }
    }
  }

  // Validate environment variables
  validateEnvironment() {
    console.log("🔍 Validating environment variables...");

    const required = [
      "DB_HOST",
      "DB_USER",
      "DB_PASSWORD",
      "DB_NAME",
      "JWT_SECRET",
    ];

    const optional = [
      { name: "NODE_ENV", default: "development" },
      { name: "PORT", default: "5000" },
      { name: "MAX_FILE_SIZE", default: "10485760" },
      { name: "MAX_FILES_PER_REQUEST", default: "5" },
      { name: "UPLOAD_CLEANUP_INTERVAL", default: "3600000" },
      { name: "UPLOAD_FILE_MAX_AGE", default: "86400000" },
    ];

    // Check required variables
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error(
        `❌ Missing required environment variables: ${missing.join(", ")}`
      );
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    // Set defaults for optional variables
    optional.forEach(({ name, default: defaultValue }) => {
      if (!process.env[name]) {
        process.env[name] = defaultValue;
        console.log(`🔧 Set default ${name}=${defaultValue}`);
      }
    });

    console.log("✅ Environment validation complete");
  }

  // Check system requirements
  async checkSystemRequirements() {
    console.log("⚙️ Checking system requirements...");

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

    if (majorVersion < 18) {
      console.warn(
        `⚠️ Node.js ${nodeVersion} detected. Recommended: Node.js 18+`
      );
    } else {
      console.log(`✅ Node.js version: ${nodeVersion}`);
    }

    // Check file system access
    try {
      await fs.stat(process.cwd());
      console.log("✅ File system accessible");
    } catch (error) {
      console.error("❌ File system check failed:", error.message);
      throw error;
    }
  }

  // Create upload configuration file - ONLY if it doesn't exist
  async createUploadConfig() {
    const configDir = path.join(__dirname, "../config");
    const configPath = path.join(configDir, "upload.json");

    try {
      // Check if config file already exists
      await fs.access(configPath);
      console.log("📄 Upload configuration already exists");
      return; // File exists, skip creating it
    } catch {
      // File doesn't exist, create it
    }

    const config = {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"),
      maxFiles: parseInt(process.env.MAX_FILES_PER_REQUEST || "5"),
      allowedMimeTypes: (
        process.env.ALLOWED_MIME_TYPES ||
        "image/jpeg,image/jpg,image/png,image/webp,application/pdf,image/heic,image/heif"
      ).split(","),
      allowedExtensions: (
        process.env.ALLOWED_EXTENSIONS ||
        ".jpg,.jpeg,.png,.webp,.pdf,.heic,.heif"
      ).split(","),
      cleanupInterval: parseInt(
        process.env.UPLOAD_CLEANUP_INTERVAL || "3600000"
      ),
      fileMaxAge: parseInt(process.env.UPLOAD_FILE_MAX_AGE || "86400000"),
      uploadPath: path.join(__dirname, "../../uploads"),
      tempPath: path.join(__dirname, "../../temp"),
    };

    try {
      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log("📄 Upload configuration created");
    } catch (error) {
      console.warn("⚠️ Failed to create upload config:", error.message);
    }
  }

  // Run all startup tasks
  async initialize() {
    try {
      console.log("🚀 Starting CashMate backend initialization...");
      console.log("=".repeat(50));

      this.validateEnvironment();
      await this.checkSystemRequirements();
      await this.ensureDirectories();
      await this.createGitKeepFiles();
      await this.createUploadConfig();

      console.log("=".repeat(50));
      console.log("✅ Initialization complete!");
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌 Port: ${process.env.PORT}`);
      console.log(
        `📁 Max file size: ${Math.floor(
          parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024
        )}MB`
      );
      console.log("=".repeat(50));
    } catch (error) {
      console.error("❌ Initialization failed:", error.message);
      throw error;
    }
  }
}

export const startupManager = new StartupManager();

export async function ensureDirectoriesExist() {
  const startup = new StartupManager();
  await startup.ensureDirectories();
}
