import { Request, Response } from "express";
import { google } from "googleapis";
import Tenant from "../models/Tenant";

// Configure OAuth2 Client with your credentials from Google Cloud Console
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:3000/api/auth/google/callback
);

// Step 1: Redirect User to Google
export const getAuthUrl = (req: any, res: Response) => {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: Gives us the refresh_token
    prompt: 'consent',     // Forces Google to show the consent screen every time
    scope: scopes,
  });

  res.json({ url });
};

// Step 2: Handle Callback and Save Tokens
export const googleCallback = async (req: any, res: Response) => {
  const { code } = req.query;

  try {
    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);

    // Save tokens to the Tenant model
    await Tenant.findByIdAndUpdate(req.user.tenant_id, {
      "googleAuth.accessToken": tokens.access_token,
      "googleAuth.refreshToken": tokens.refresh_token,
      "googleAuth.expiryDate": tokens.expiry_date,
      isCalendarLinked: true
    });

    // Redirect back to your frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=success`);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error`);
  }
};