import express from "express";
import { 
  getCallStats, 
  getContactsSummary, 
  getFullHistory, 
  syncCallResults
} from "../controllers/callLog.controller";

const router = express.Router();

// Matches: GET /api/call-logs/stats
router.get("/stats", getCallStats);

// Matches: GET /api/call-logs/summary
router.get("/summary", getContactsSummary);

// Matches: GET /api/call-logs/history (This is the one for your new page)
router.get("/history", getFullHistory);

// Matches: POST /api/call-logs/sync
router.post("/sync", syncCallResults);

export default router;