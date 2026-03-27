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
import bolnaRoutes from "./routes/bolna.routes";
import agenda from "./config/agenda";
import { fetchLeadDetails } from './services/metaService';
import Lead from './models/Lead';

// Service Imports
import { getAutomationStatus } from "./services/automationEngine";
import Contact from "./models/Contact";

dotenv.config();

const app = express();

// --- GLOBAL MIDDLEWARE ---

// Update this in your app.ts
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'https://app.voaiz.com', 
  'https://demo.voaiz.com',
  'https://mellifluous-belekoy-40fab9.netlify.app' // Keep this as a backup
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS Error: Origin not allowed'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));



// --- GLOBAL MIDDLEWARE ---

app.use((req, res, next) => {
  // This header bypasses the ngrok "Visit Site" warning page for API calls
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// ... rest of your app.use(cors...)



app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
// --- PUBLIC ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes); // Public access for Bolna callbacks
app.use("/api/calendar", calendarRoutes); // Calendar webhook routes



// --- 1. THE META HANDSHAKE (GET) ---
// This handles the initial connection verification from Meta Dashboard
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('✅ WEBHOOK_VERIFIED by Meta');
    return res.status(200).send(challenge);
  }
  
  console.error('❌ WEBHOOK_VERIFICATION_FAILED: Token mismatch');
  res.sendStatus(403);
});

// --- 2. THE LEAD PROCESSOR (POST) ---
// This handles actual lead data from Richinnovations business ads
app.post('/webhook', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === 'page') {
    // Meta sends an array of entries
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const { leadgen_id, form_id, ad_id, page_id } = change.value;
          
          console.log('-------------------------------------------');
          console.log('🚀 NEW LEAD DETECTED FROM META!');
          console.log(`Lead ID: ${leadgen_id} | Form: ${form_id}`);

          try {
            // Step 1: Fetch full details using the Service we built
            const leadData = await fetchLeadDetails(leadgen_id);

            if (leadData) {
              console.log(`📦 DATA RETRIEVED for ${leadData.fullName}`);

              // Step 2: Save to MongoDB using your Lead model
              // This is the "Memory" for Richinnovations leads
              await Lead.create({
                leadId: leadgen_id,
                adId: ad_id,
                formId: form_id,
                pageId: page_id,
                fullName: leadData.fullName,
                phoneNumber: leadData.phoneNumber,
                email: leadData.email,
                status: 'pending' // Ready for future tasks
              });

              console.log('💾 Lead successfully saved to MongoDB');
            }
          } catch (error) {
            console.error('❌ Error processing lead data:', error);
          }
          console.log('-------------------------------------------');
        }
      }
    }
    
    // Meta requires a 200 OK response to stop retrying the webhook
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.sendStatus(404);
});

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




// 2. Use them BEFORE your 'protect' middleware 
// This ensures Bolna can reach the endpoint without a token
app.use('/api/bolna', bolnaRoutes);

export default app;