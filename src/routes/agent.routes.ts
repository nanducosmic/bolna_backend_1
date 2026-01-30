import express from "express";
import { saveAgent, getAgents, simulateCall } from "../controllers/agent.controller";
import { protect } from "../middleware/authMiddleware"; // Add this!

const router = express.Router();

// This ensures only logged-in users with a token can touch these routes
router.use(protect); 

router.post("/", saveAgent);
router.get("/", getAgents);
router.post("/simulate-call", simulateCall);
export default router;