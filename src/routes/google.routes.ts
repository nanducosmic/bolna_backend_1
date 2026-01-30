import { Router } from "express";
import { getAuthUrl, googleCallback } from "../controllers/googleAuth.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.get("/google-calendar", protect, getAuthUrl);
router.get("/google-calendar/callback", googleCallback); // Google hits this public URL

export default router;