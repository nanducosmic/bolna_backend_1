import express from "express";
import { saveAgent, getAgent } from "../controllers/agent.controller";

const router = express.Router();

router.post("/", saveAgent);
router.get("/", getAgent);

export default router;
