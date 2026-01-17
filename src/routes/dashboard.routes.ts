import express from "express";
import { getCallStats ,seedDemoCalls} from "../controllers/dashboard.controller";

const router = express.Router();

router.get("/stats", getCallStats);

router.post("/seed", seedDemoCalls);

export default router;
