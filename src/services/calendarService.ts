import { google } from 'googleapis';
import Tenant from "../models/Tenant";

/**
 * Shared Service Function: Gets authenticated Google Calendar instance for a tenant
 */
export const getTenantCalendarAuth = async (tenantId: string) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.googleAuth?.refreshToken) {
      console.error(`CALENDAR_AUTH_ERROR: No refresh token found for tenant ${tenantId}`);
      throw new Error('CALENDAR_AUTH_ERROR: Calendar not linked for this tenant');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: tenant.googleAuth.refreshToken
    });


oauth2Client.on('tokens', async (tokens) => {
  // 1. Safety Check: Ensure the tenant and the googleAuth object exist
  if (!tenant || !tenant.googleAuth) {
    console.error("❌ Cannot save tokens: Tenant or googleAuth is undefined");
    return;
  }

  // 2. Update the Refresh Token (only if Google sends a new one)
  if (tokens.refresh_token) {
    // Use '?? undefined' to convert any 'null' to 'undefined'
    tenant.googleAuth.refreshToken = tokens.refresh_token ?? undefined;
  }

  // 3. Update the Access Token
  if (tokens.access_token) {
    tenant.googleAuth.accessToken = tokens.access_token ?? undefined;
  }

  try {
    await tenant.save();
    console.log("🔄 Google Tokens refreshed and saved for tenant:", tenantId);
  } catch (err: any) {
    console.error("❌ Failed to save refreshed tokens to DB:", err.message);
  }
});
    
    

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    return {
      calendar,
      calendarId: tenant.googleAuth.calendarId || 'primary',
      tenant
    };

  } catch (error: any) {
    if (error.message.includes('CALENDAR_AUTH_ERROR')) {
      throw error;
    }
    
    if (error.code === 401 || error.code === 403) {
      console.error(`CALENDAR_AUTH_ERROR: Token expired/invalid for tenant ${tenantId}`);
      throw new Error('CALENDAR_AUTH_ERROR: Calendar authentication expired');
    }
    
    console.error(`CALENDAR_AUTH_ERROR: Unexpected error for tenant ${tenantId}:`, error.message);
    throw new Error('CALENDAR_AUTH_ERROR: Calendar authentication failed');
  }
};

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
 * ✅ FIXED: Slot-based Availability Logic using proper ISO + timezone
 */
export const checkSlotAvailability = async (
  tenantId: string,
  startTime: Date,
  endTime: Date
) => {
  try {
    const { calendar, calendarId, tenant } = await getTenantCalendarAuth(tenantId);
    
    const tenantTimezone = tenant.bookingSettings?.timezone || 'Asia/Kolkata';
    console.log(`🕐 Checking availability for tenant ${tenantId} in timezone: ${tenantTimezone}`);
    console.log('RAW startTime:', startTime.toISOString());
    console.log('RAW endTime:', endTime.toISOString());

    // ✅ CORRECT: Send ISO directly to Google (no Intl.DateTimeFormat + reparse)
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        timeZone: tenantTimezone,
        items: [{ id: calendarId }]
      }
    });

    const busyPeriods = response.data.calendars?.[calendarId]?.busy || [];

    if (busyPeriods.length === 0) {
      return {
        isAvailable: true,
        busyPeriods,
        timezone: tenantTimezone,
        message: `Time slot is available (${tenantTimezone})`
      };
    }

    // ---- Suggested Slots Logic (kept, now works correctly) ----
    const suggestedSlots = [];
    const checkInterval = 30 * 60 * 1000; // 30 minutes
    const maxCheckTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    
    for (
      let checkTime = new Date(startTime.getTime() + checkInterval); 
      checkTime <= maxCheckTime; 
      checkTime = new Date(checkTime.getTime() + checkInterval)
    ) {
      const checkEnd = new Date(checkTime.getTime() + checkInterval);
      
      const hasConflict = busyPeriods.some((busy: any) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return checkTime < busyEnd && checkEnd > busyStart;
      });
      
      if (!hasConflict) {
        suggestedSlots.push({
          start_time: checkTime.toISOString(),
          end_time: checkEnd.toISOString(),
          local_time: checkTime.toLocaleTimeString('en-US', { 
            timeZone: tenantTimezone, 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
        
        if (suggestedSlots.length >= 2) break;
      }
    }

    return {
      isAvailable: false,
      busyPeriods,
      timezone: tenantTimezone,
      message: `Slot ${startTime.toLocaleTimeString('en-US', { timeZone: tenantTimezone })} is taken. Suggested times: ${suggestedSlots.map(s => s.local_time).join(', ')}`,
      suggested_times: suggestedSlots.map(s => s.start_time)
    };

  } catch (error: any) {
    if (error.message.includes('CALENDAR_AUTH_ERROR')) {
      throw error;
    }
    console.error(`Error checking availability for tenant ${tenantId}:`, error.message);
    throw new Error('Failed to check calendar availability');
  }
};

/**
 * Legacy function: Checks if the tenant has any events in the next 1 hour
 * (Kept for backward compatibility — DO NOT use for booking decisions)
 */
export const checkIsBusy = async (tenantId: string) => {
  try {
    const { calendar, calendarId } = await getTenantCalendarAuth(tenantId);
    
    const now = new Date();
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      singleEvents: true,
    });

    const events = response.data.items || [];
    return events.length > 0; 
  } catch (error: any) {
    if (error.message.includes('CALENDAR_AUTH_ERROR')) {
      throw error;
    }
    console.error(`Error checking if tenant ${tenantId} is busy:`, error.message);
    throw new Error('Failed to check calendar status');
  }
};

/**
 * Lists all available calendars for the tenant
 */
export const listAvailableCalendars = async (tenantId: string) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.googleAuth?.refreshToken) {
    throw new Error("Calendar not linked for this tenant");
  }

  const oauth2Client = getOAuth2Client(tenant);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.calendarList.list({
    minAccessRole: 'writer',
  });

  return response.data.items || [];
};

/**
 * Collision Prevention: Creates a new event with tenant isolation
 */
export const createCalendarEvent = async (
  tenantId: string,
  eventDetails: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
  }
) => {
  try {
    const { calendar, calendarId, tenant } = await getTenantCalendarAuth(tenantId);

    // ✅ MATCH timezone with availability
    const tenantTimezone = tenant.bookingSettings?.timezone || 'Asia/Kolkata';

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime,
        timeZone: tenantTimezone,
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: tenantTimezone,
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    console.log(`📅 Event created for tenant ${tenantId}: ${eventDetails.summary} in calendar ${calendarId}`);
    return response.data;

  } catch (error: any) {
    if (error.message.includes('CALENDAR_AUTH_ERROR')) {
      throw error;
    }
    console.error(`Error creating event for tenant ${tenantId}:`, error.message);
    throw new Error('Failed to create calendar event');
  }
};
