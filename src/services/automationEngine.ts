import { google } from 'googleapis';
import path from 'path';

const CALENDAR_ID = 'madan.digma@gmail.com';

// --- HYBRID AUTH LOGIC ---
let auth: any;

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  // 1. FOR RAILWAY: Uses the Environment Variable
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
} else {
  // 2. FOR LOCAL: Uses your local file
  const KEYFILEPATH = path.join(process.cwd(), 'google-credentials.json');
  auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
}


export const getAutomationStatus = async () => {
  try {
    // We keep the logs so you can see the time in the terminal
    const now = new Date();
    const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    console.log(`[DEMO MODE] IST Time: ${istTime} - Bypassing all blocks.`);

    /* --- TEMPORARILY DISABLED FOR DEMO ---
       1. Weekend Check 
       2. Working Hours Check 
       3. Google Calendar Check
    */

    // Force return true so the "403 Forbidden" disappears
    return { 
      allowed: true, 
      reason: "System Operational (Demo Mode)" 
    };

  } catch (error: any) {
    console.error("Calendar Engine Error:", error.message);
    // Even if there is an error, we allow the call for the demo
    return { allowed: true, reason: "Demo Bypass" };
  }
};