import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 1. New Imports for Security
import authRoutes from "./routes/authRoutes";
import { protect, adminOnly } from "./middleware/authMiddleware";

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
// This must stay unprotected so people can actually login!
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

// --- PROTECTED ROUTES ---
// We add 'protect' and 'adminOnly' BEFORE your existing routes.
// This doesn't change your routes, it just checks for a token first.

app.use("/api/calls", protect, adminOnly, callRoutes);        // Secure calling
app.use("/api/dashboard", protect, adminOnly, dashboardRoutes); // Secure stats
app.use("/api/call-logs", protect, adminOnly, callLogRoutes);   // Secure logs

// If you want EVERYONE (even non-admins) to see contacts/agents, remove 'adminOnly'
app.use("/api/agent", protect, agentRoutes); 
app.use("/api/contacts", protect, contactRoutes);

export default app;