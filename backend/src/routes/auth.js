// backend/src/routes/auth.js
import express from "express";
import { AuthController } from "../controllers/authController.js";
import {
  validateRequest,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post(
  "/register",
  validateRequest(registerSchema),
  AuthController.register
);
router.post("/login", validateRequest(loginSchema), AuthController.login);
router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  AuthController.refreshToken
);
router.post("/logout", AuthController.logout);

// Protected routes
router.get("/profile", authenticateToken, AuthController.getProfile);
router.put("/profile", authenticateToken, AuthController.updateProfile);

export default router;
