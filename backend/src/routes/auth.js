import express from "express";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  validateRequest,
} from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  login,
  register,
  refreshAccessToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

const router = express.Router();

// Public routes
router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post(
  "/refresh",
  validateRequest(refreshTokenSchema),
  refreshAccessToken
);
router.post("/logout", logout);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/change-password", authenticateToken, changePassword);

export default router;
