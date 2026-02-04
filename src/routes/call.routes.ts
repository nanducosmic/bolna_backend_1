import express from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { initiateCalls } from "../controllers/call.controller";

const router = express.Router();

router.post("/initiate", protect, authorize("admin", "super_admin"), initiateCalls);

export default router;
