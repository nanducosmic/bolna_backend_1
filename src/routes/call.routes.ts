import express from "express";
import { initiateCalls } from "../controllers/call.controller";

const router = express.Router();

router.post("/initiate", initiateCalls);

export default router;
