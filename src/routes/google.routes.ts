import { Router, Request, Response } from "express";
import { google } from "googleapis";
import Tenant from "../models/Tenant"; 

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1. DYNAMIC CONNECT ROUTE
router.get("/connect", (req: Request, res: Response) => {
  console.log("🚀 Redirecting to Google for Tenant:", req.query.tenantId);

  const { tenantId } = req.query; 

  if (!tenantId) {
    return res.status(400).send("Error: No Tenant ID provided in the URL.");
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    prompt: 'consent',     
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ],
    state: tenantId as string // Carries the Tenant ID through the Google process
  });

  res.redirect(url);
});

// 2. DYNAMIC CALLBACK ROUTE
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query; // 'state' is the tenantId
    if (!code) throw new Error("No code provided");

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    let email = null;
    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      email = ticket.getPayload()?.email;
    }

    // --- UPDATING THE TENANT FOLDER (Exact Match to your structure) ---
    await Tenant.findByIdAndUpdate(
      state, 
      { 
        $set: {
          isCalendarLinked: true, // Fix: Set at root level, not nested
          "googleAuth.calendarId": "primary",
          "googleAuth.accessToken": tokens.access_token,
          "googleAuth.refreshToken": tokens.refresh_token, 
          "googleAuth.expiryDate": tokens.expiry_date,
          // Storing email inside googleAuth as per your previous setup
          "googleAuth.email": email 
        }
      }
    );

    console.log(`✅ Success! Tokens saved for Tenant ID: ${state}`);
    
    // Redirect back to your frontend
    res.redirect(`${process.env.FRONTEND_URL}/integrations?status=success`);

  } catch (error: any) {
    console.error("❌ Google OAuth Callback Error:", error.message);
    res.redirect(`${process.env.FRONTEND_URL}/integrations?status=error`);
  }
});

export default router;