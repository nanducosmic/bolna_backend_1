import { Router } from "express";
import { startCampaign } from "../controllers/campaign.controller";
// import { authMiddleware } from "../middleware/auth"; // If you have one

const router = Router();

// Endpoint: POST /api/campaigns/start
router.post("/start", startCampaign); 

export default router;