// backend/server.js
import dotenv from "dotenv";
import app from "./src/app.js";
import { startupManager } from "./src/utils/startup.js";

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server with proper initialization
const startServer = async () => {
  try {
    // Run startup initialization
    await startupManager.initialize();

    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(`📁 Upload endpoints: http://localhost:${PORT}/api/receipts`);
      console.log(
        `💰 Transaction endpoints: http://localhost:${PORT}/api/transactions`
      );
    });

    // Handle server shutdown gracefully
    const handleShutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      server.close((err) => {
        if (err) {
          console.error("Error during server shutdown:", err);
          process.exit(1);
        }

        console.log("✅ Server closed successfully");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();
