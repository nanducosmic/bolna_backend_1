import { Router, Request, Response } from "express";
import { google } from "googleapis";
import Tenant from "../models/Tenant"; 
import User from "../models/User"; // Ensure this points to your User model


const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1. DYNAMIC CONNECT ROUTE
router.get("/connect", (req: Request, res: Response) => {
  // Grab the tenantId passed from your Frontend button
  const { tenantId } = req.query; 

  if (!tenantId) {
    return res.status(400).send("No Tenant ID provided.");
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Mandatory to get refresh_token
    prompt: 'consent',     // Forces Google to show consent screen and give a refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ],
    state: tenantId as string
  });
  res.redirect(url);
});

// 2. DYNAMIC CALLBACK ROUTE
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
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
    // Update User
  await User.findOneAndUpdate(
      { tenant_id: state },
      { 
        isCalendarLinked: true,
        googleAuth: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token, // This is crucial for offline access
          expiryDate: tokens.expiry_date,
          email: email
        }
      }
    );
    // ✅ Replaced with dynamic environment variable
    res.redirect(`${process.env.FRONTEND_URL}/integrations?status=success`);
  } catch (error: any) {
    console.error("❌ Google OAuth Callback Error:", error.message);
    // ✅ Replaced with dynamic environment variable
    res.redirect(`${process.env.FRONTEND_URL}/integrations?status=error`);
  }
});

export default router;