import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Middleware Imports
import { protect, superAdminOnly } from "./middleware/authMiddleware";

// Route Imports
import authRoutes from "./routes/authRoutes";
import tenantRoutes from "./routes/tenant.routes";
import contactRoutes from "./routes/contact.routes";
import agentRoutes from "./routes/agent.routes";
import callRoutes from "./routes/call.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import callLogRoutes from "./routes/callLog.routes";
import creditRoutes from "./routes/credit.routes";
import campaignRoutes from "./routes/campaign.routes";
import googleRoutes from "./routes/google.routes";
import webhookRoutes from "./routes/webhook.routes"; 
import knowledgeBaseRoutes from "./routes/knowledgeBase.routes"; 
import adminRoutes from "./routes/admin.routes";
import agenda from "./config/agenda";

// Service Imports
import { getAutomationStatus } from "./services/automationEngine";

dotenv.config();

const app = express();

// --- GLOBAL MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- PUBLIC ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes); // Public access for Bolna callbacks

app.get("/", (req: Request, res: Response) => {
  res.send("Backend API running 🚀");
});

// --- PROTECTED ROUTES (Tenant & Admin) ---
app.use("/api/agent", protect, agentRoutes); 
app.use("/api/contacts", protect, contactRoutes);
app.use("/api/campaigns", protect, campaignRoutes);
app.use("/api/google", protect, googleRoutes);
app.use("/api/credits", protect, creditRoutes);
app.use("/api/knowledge-base", protect, knowledgeBaseRoutes); 



app.use("/api/dashboard", protect,  dashboardRoutes); 
app.use("/api/call-logs", protect, superAdminOnly, callLogRoutes);   

// Dashboard System Status
app.get("/api/system-status", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getAutomationStatus();
    res.json({ 
      allowed: status.allowed, 
      reason: status.reason 
    });
  } catch (error) {
    next(error); // Forward to global error handler
  }
});

// --- ADMIN ONLY ROUTES ---
app.use("/api/admin", protect, superAdminOnly, adminRoutes);
app.use("/api/tenants", protect, superAdminOnly, tenantRoutes);
app.use("/api/calls", protect, superAdminOnly, callRoutes);        

// --- 404 CATCHER ---
// This handles any requests to routes that don't exist
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// --- GLOBAL ERROR HANDLER ---
// Must be the LAST middleware in the file
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🚨 Global Error Handler:", err.stack);
  
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;