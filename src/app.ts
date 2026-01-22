import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 1. New Imports for Security
import authRoutes from "./routes/authRoutes";
import { protect, adminOnly } from "./middleware/authMiddleware";

// 2. Import the Automation Engine Service
import { getAutomationStatus } from "./services/automationEngine";

// Your Existing Imports
import contactRoutes from "./routes/contact.routes";
import agentRoutes from "./routes/agent.routes";
import callRoutes from "./routes/call.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import callLogRoutes from "./routes/callLog.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// --- PUBLIC ROUTES ---
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

// --- PROTECTED ROUTES ---

// NEW: System Status Route for the Dashboard Banner
app.get("/api/system-status", protect, async (req, res) => {
  try {
    const status = await getAutomationStatus();
    // We send back 'allowed' and 'reason' exactly as the frontend expects
    res.json({ 
      allowed: status.allowed, 
      reason: status.reason 
    });
  } catch (error) {
    res.status(500).json({ allowed: false, reason: "Calendar Error" });
  }
});

app.use("/api/calls", protect, adminOnly, callRoutes);        
app.use("/api/dashboard", protect, adminOnly, dashboardRoutes); 
app.use("/api/call-logs", protect, adminOnly, callLogRoutes);   

app.use("/api/agent", protect, agentRoutes); 
app.use("/api/contacts", protect, contactRoutes);

export default app;