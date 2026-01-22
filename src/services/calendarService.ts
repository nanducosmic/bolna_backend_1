import { google } from 'googleapis';
import path from 'path';

// This points to the file you downloaded earlier
const KEYFILEPATH = path.join(__dirname, 'google-credentials.json'); 
const CALENDAR_ID = 'madan.digma@gmail.com';

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

export const checkIsBusy = async () => {
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    // Check for any event happening in the next 1 minute
    timeMax: new Date(now.getTime() + 60000).toISOString(), 
    singleEvents: true,
  });

  const events = response.data.items || [];
  // Returns true if there's an event, false if you're free
  return events.length > 0; 
};