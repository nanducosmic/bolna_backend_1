import { Router } from "express";
import { identifyCaller } from "../controllers/bolna.controller";

const router = Router();

// Public route for Bolna caller identification - NO auth middleware
router.get('/identify-caller', identifyCaller);

export default router;
