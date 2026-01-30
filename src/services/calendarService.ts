import { google } from 'googleapis';
import Tenant from "../models/Tenant";

/**
 * Shared Helper: Sets up the OAuth2 client for a specific tenant
 */
const getOAuth2Client = (tenant: any) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: tenant.googleAuth.refreshToken
  });

  return oauth2Client;
};

/**
 * Checks if the tenant has any events in the next 1 hour
 */
export const checkIsBusy = async (tenantId: string) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.googleAuth?.refreshToken) {
    throw new Error("Calendar not linked for this tenant");
  }

  const oauth2Client = getOAuth2Client(tenant);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const now = new Date();
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    singleEvents: true,
  });

  const events = response.data.items || [];
  return events.length > 0; 
};

/**
 * Inserts a new event into the tenant's primary calendar
 */
export const createCalendarEvent = async (tenantId: string, eventDetails: {
  summary: string;
  description: string;
  startTime: string; // Must be ISO string
  endTime: string;   // Must be ISO string
}) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.googleAuth?.refreshToken) {
    throw new Error("Calendar not linked for this tenant");
  }

  const oauth2Client = getOAuth2Client(tenant);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startTime,
      timeZone: 'UTC', 
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: 'UTC',
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
};