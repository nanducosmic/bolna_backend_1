// routes/callLog.routes.ts
import express from "express";
import { getCallStats, getContactsSummary } from "../controllers/callLog.controller";
import CallLog from "../models/CallLog";

const router = express.Router();

router.get("/stats", getCallStats);
router.get("/call-logs/stats", getCallStats);  // for frontend api.ts
router.get("/contacts-summary", getContactsSummary); // for ContactsTable
router.get("/", async (_, res) => {
  const logs = await CallLog.find().sort({ createdAt: -1 });
  res.json(logs);
});

export default router;
