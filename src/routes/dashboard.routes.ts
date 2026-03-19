// src/routes/dashboard.routes.ts
import express from "express";
// Change getCallStats to getDashboardStats to match your controller
import { getDashboardStats } from "../controllers/dashboard.controller";

const router = express.Router();

// Match the name here
router.get("/stats", getDashboardStats);

// Comment this out until you actually create the function in the controller
// router.post("/seed", seedDemoCalls); 

export default router;