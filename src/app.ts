import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from 'mongoose';
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
import calendarRoutes from "./routes/calendar.routes";
import knowledgeBaseRoutes from "./routes/knowledgeBase.routes";
import tenantsStatusRoutes from "./routes/tenants.routes"; 
import adminRoutes from "./routes/admin.routes";
import agenda from "./config/agenda";

// Service Imports
import { getAutomationStatus } from "./services/automationEngine";
import Contact from "./models/Contact";

dotenv.config();

const app = express();

// --- GLOBAL MIDDLEWARE ---
app.use(cors({
  origin: 'http://localhost:5174',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  credentials: true
}));
app.use(express.json());

// --- PUBLIC ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes); // Public access for Bolna callbacks
app.use("/api/calendar", calendarRoutes); // Calendar webhook routes

app.get("/", (req: Request, res: Response) => {
  res.send("Backend API running 🚀");
});

// --- TENANT STATUS ROUTES (Accessible by any authenticated user) ---
app.use("/api/tenant-status", protect, tenantsStatusRoutes);

// --- PROTECTED ROUTES (Tenant & Admin) ---
app.use("/api/agent", protect, agentRoutes); 
app.use("/api/contacts", protect, contactRoutes);
app.use("/api/campaigns", protect, campaignRoutes);
app.use("/api/google", protect, googleRoutes);
app.use("/api/credits", protect, creditRoutes);
app.use("/api/knowledge-base", protect, knowledgeBaseRoutes); 

// Add this above the 404 Catcher

app.use("/api/dashboard", protect,  dashboardRoutes); 
app.use("/api/call-logs", protect, callLogRoutes);   

// Dashboard System Status
app.get("/api/system-status", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getAutomationStatus();
    res.json({ 
      allowed: status.allowed, 
      reason: status.reason 
    });
  } catch (error) {
    next(error); // Forward to global handler
  }
});

// --- GOOGLE AUTH ROUTES (Only protected by 'protect', not 'superAdminOnly') ---
app.use("/api/google-auth", googleRoutes);

// --- ADMIN ONLY ROUTES ---
app.use("/api/admin", protect, superAdminOnly, adminRoutes);
app.use("/api/tenants", protect, superAdminOnly, tenantRoutes);
// Allow both admin and super_admin for /api/calls
app.use("/api/calls", protect, callRoutes);

// --- HEALTH CHECK ROUTE ---
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;

    // 1. Explicitly check if the DB instance exists
    if (!db) {
      throw new Error('Database instance is not initialized');
    }

    // 2. Perform the ping (TypeScript now knows db is defined)
    await db.admin().ping();
    
    // 3. Check for model readiness
    // Instead of querying data (which might be empty), just check if the model is compiled
    const isUserModeReady = !!mongoose.models.User;
    
    // Optional: Only run query if you specifically need to test read permissions
    // await mongoose.model('User').findOne().select('_id').lean();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(), // Added for better health metrics
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      error: error.message || 'Unknown Error'
    });
  }
});
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


// DELETE THIS AFTER USE!
app.get('/api/debug/clear-contacts', async (req, res) => {
  try {
    const result = await Contact.deleteMany({});
    res.json({ message: "Success", deletedCount: result.deletedCount });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'object' && err && 'message' in err) {
      message = (err as any).message;
    } else if (typeof err === 'string') {
      message = err;
    }
    res.status(500).json({ error: message });
  }
});

export default app;