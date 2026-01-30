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

// Step 2: Handle Callback and Save Tokens
// Step 1: Pass the tenant_id in the 'state' parameter
export const getAuthUrl = (req: any, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: req.user.tenant_id.toString() // <--- Encode the ID here
  });
  res.json({ url });
};

// Step 2: Retrieve the ID from the state
export const googleCallback = async (req: any, res: Response) => {
  const { code, state } = req.query; // 'state' is the tenant_id we passed above

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    // Use 'state' instead of 'req.user' to find the tenant
    await Tenant.findByIdAndUpdate(state, {
      "googleAuth.accessToken": tokens.access_token,
      "googleAuth.refreshToken": tokens.refresh_token,
      "googleAuth.expiryDate": tokens.expiry_date,
      isCalendarLinked: true
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?calendar=success`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?calendar=error`);
  }
};