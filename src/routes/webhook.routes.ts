import { Router } from "express";
import { handleBolnaWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/bolna-callback", handleBolnaWebhook);

export default router;