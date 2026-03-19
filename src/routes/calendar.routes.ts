import { Router } from "express";
import { calendarWebhook } from "../controllers/calendar.controller";

const router = Router();

router.post("/bolna-callback", calendarWebhook);

// POST /api/calendar/webhook - Receives Bolna webhook requests
router.post("/webhook", calendarWebhook);

export default router;
