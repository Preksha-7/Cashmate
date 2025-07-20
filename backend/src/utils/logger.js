// File: backend/src/utils/logger.js

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url"; // Required for __dirname equivalent in ES Modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "../../logs");

// It's assumed that the 'logs' directory is created by the StartupManager
// or another initialization process before the logger attempts to write to it.
// Removed the synchronous fs.existsSync and fs.mkdirSync calls.

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) =>
            `${info.timestamp} ${info.level}: ${info.message} ${
              info.stack ? "\n" + info.stack : ""
            }`
        )
      ),
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
    }),
  ],
});

export { logger };
