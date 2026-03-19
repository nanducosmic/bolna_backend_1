import { Request, Response } from "express";
import { google } from "googleapis";
import Tenant from "../models/Tenant";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getAuthUrl = (req: any, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    // 'consent' is vital to ensure Google sends the refreshToken again
    prompt: 'consent', 
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly' 
    ],
    state: req.query.tenantId?.toString() || req.user?.tenant_id?.toString() 
  });
  res.json({ url });
};

export const googleCallback = async (req: any, res: Response) => {
  // 'state' is the Tenant ID sent from the frontend/auth URL
  const { code, state } = req.query; 

  try {
    console.log(`📡 Callback received for Tenant ID: ${state}`);

    if (!code) {
      throw new Error("No authorization code received from Google");
    }

    // 1. Exchange the authorization code for access & refresh tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // 2. Extract the Google Email (to show in the UI badge)
    let userEmail = null;
    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      userEmail = payload?.email;
    }

    // 3. Prepare the update object
    const updateFields: any = {
      "googleAuth.accessToken": tokens.access_token,
      "googleAuth.expiryDate": tokens.expiry_date,
      "googleAuth.calendarId": "primary",
      "googleAuth.email": userEmail, 
      isCalendarLinked: true
    };

    // Important: Google only sends the refresh_token on the FIRST connection
    // We check if it exists so we don't overwrite a good token with 'undefined'
    if (tokens.refresh_token) {
      updateFields["googleAuth.refreshToken"] = tokens.refresh_token;
    }

    // 4. Update the Database
    // We use .trim() on state just in case there are hidden spaces
    console.log("🔧 Updating tenant with fields:", updateFields);
    console.log("🆔 Tenant ID from state:", (state as string).trim());
    
    const updatedTenant = await Tenant.findByIdAndUpdate(
      (state as string).trim(), 
      { $set: updateFields },
      { new: true, runValidators: true } 
    );
    console.log("✅ Updated tenant result:", updatedTenant);
    
    // Double-check the update
    const checkTenant = await Tenant.findById((state as string).trim());
    console.log("🔍 Double-check tenant after update:", {
      isCalendarLinked: checkTenant?.isCalendarLinked,
      googleEmail: checkTenant?.googleAuth?.email 
    });

    if (!updatedTenant) {
      console.error(`❌ DB Error: No Tenant found with ID: ${state}`);
      // Redirect with a specific error so the UI can tell the user
      return res.redirect(`${process.env.FRONTEND_URL}/integrations?calendar=error&reason=tenant_not_found`);
    }

    console.log(`✅ Success! Calendar linked to: ${userEmail} for Tenant: ${state}`);
    
    // 5. Final Redirect to Frontend Integrations Page
    // This triggers the useEffect we wrote to flip the UI to "Connected"
    return res.redirect(`${process.env.FRONTEND_URL}/integrations?calendar=success`);
    
  } catch (error: any) {
    console.error("❌ Google Callback Error:", error.message);
    
    // Redirect to frontend with error state
    const errorUrl = new URL(`${process.env.FRONTEND_URL}/integrations`);
    errorUrl.searchParams.append('calendar', 'error');
    errorUrl.searchParams.append('message', error.message);
    
    return res.redirect(errorUrl.toString());
  }
};