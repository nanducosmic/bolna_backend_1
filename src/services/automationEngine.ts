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
    const now = new Date();
    
    // Convert to IST for logging and checking
    const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const hourIST = new Date(istTime).getHours();
    const dayIST = new Date(istTime).getDay();

    console.log(`[Engine Check] IST Time: ${istTime} | Day: ${dayIST} | Hour: ${hourIST}`);

    // 1. Weekend Check (Sat=6, Sun=0)
    if (dayIST === 0 || dayIST === 6) {
      return { allowed: false, reason: "Weekend - System Offline" };
    }

    // 2. Working Hours Check (9 AM to 6 PM IST)
    if (hourIST < 9 || hourIST >= 18) {
      return { allowed: false, reason: "Outside Working Hours" };
    }

    // 3. Google Calendar Check
    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 10000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    if (events.length > 0) {
      const eventName = events[0].summary || "Scheduled Event";
      return { allowed: false, reason: `Busy: ${eventName}` };
    }

    return { allowed: true, reason: "System Operational" };

  } catch (error: any) {
    console.error("Calendar Engine Error:", error.message);
    return { allowed: false, reason: "Calendar Sync Error" };
  }
};