import express from "express";
import { saveAgent, getAgents, simulateCall, startCampaign } from "../controllers/agent.controller";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Middleware to protect all routes below
router.use(protect); 

// 1. Agent Management & Training
router.post("/", saveAgent);      // Create or Update (Training)
router.get("/", getAgents);       // List Agents assigned to Sub-user

// 2. Campaign Execution
router.post("/start-campaign", startCampaign); // Run campaign for queued contacts

// 3. Testing/Simulation
router.post("/simulate-call", simulateCall);

export default router;