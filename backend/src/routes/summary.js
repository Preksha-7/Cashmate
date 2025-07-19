import express from "express";
import {
  getCategorySummary,
  getMonthlySummary,
} from "../controllers/summaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/category", protect, getCategorySummary);
router.get("/monthly", protect, getMonthlySummary);

export default router;
