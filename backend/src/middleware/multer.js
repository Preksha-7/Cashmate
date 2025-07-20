import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const createUploadDir = async () => {
  const uploadDir = path.join(__dirname, "../../uploads");
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// File type validation configuration
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/heic",
  "image/heif",
];

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".heic",
  ".heif",
];

// File filter function
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  if (allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      ),
      false
    );
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = await createUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `receipt_${timestamp}_${randomStr}${ext}`;
    cb(null, filename);
  },
});

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Cleanup function for temporary files
export const cleanupTempFiles = async (files) => {
  if (!files || !Array.isArray(files)) return;

  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.warn(`Failed to cleanup temp file: ${file.path}`, error.message);
    }
  }
};

// Middleware for handling upload errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = "File upload error";
    let statusCode = 400;

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = "File too large. Maximum size is 10MB";
        statusCode = 413;
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files. Maximum 5 files allowed";
        statusCode = 413;
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field";
        statusCode = 400;
        break;
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      message: error.message,
    });
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      error: "Invalid file type",
      message: error.message,
    });
  }

  next(error);
};

// Single file upload middleware
export const uploadSingle = (fieldName = "receipt") => [
  upload.single(fieldName),
  handleUploadError,
];

// Multiple files upload middleware
export const uploadMultiple = (fieldName = "receipts", maxCount = 5) => [
  upload.array(fieldName, maxCount),
  handleUploadError,
];

// File validation utility
export const validateUploadedFile = (file) => {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file extension: ${ext}`);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`Invalid MIME type: ${file.mimetype}`);
  }

  return true;
};

export default upload;
