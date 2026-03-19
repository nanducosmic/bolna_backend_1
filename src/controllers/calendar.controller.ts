import { Request, Response } from "express";
import { checkIsBusy, createCalendarEvent, checkSlotAvailability } from "../services/calendarService";
import Booking from "../models/Booking";
import mongoose from "mongoose";

/**
 * Helper to extract Tenant ID dynamically to avoid repeated logic
 */
const extractTenantId = (req: Request): string | null => {
  const context_details = req.body.context_details || req.body.parameters?.context_details;
  const tenant_id = 
    req.body.tenant_id ||
    req.headers['x-tenant-id'] || 
    context_details?.recipient_data?.tenant_id || 
    req.body.parameters?.tenant_id;
  
  if (!tenant_id || tenant_id.includes("{")) return null;
  return tenant_id as string;
};

export const calendarWebhook = async (req: Request, res: Response) => {
  try {
    console.log("📅 Calendar Webhook Received:", JSON.stringify(req.body, null, 2));

    // 1. Ignore background tasks from Bolna (summary/extraction)
    const functionName = req.body.function_name;
    if (!functionName || functionName === 'summary' || functionName === 'extraction') {
      console.log("📝 Ignoring summary/extraction request - no calendar operation needed");
      return res.status(200).send("Summary received");
    }

    // 2. Extract Tenant ID using your robust helper
    const tenant_id = extractTenantId(req);

    if (!tenant_id) {
      console.error("❌ Unidentified Tenant in request");
      return res.status(400).json({ error: "Unidentified Tenant" });
    }

    let result;

    /**
     * 3. ROUTING LOGIC
     * We check 'functionName' which maps to the 'enum' in your Bolna JSON.
     */
    switch (functionName) {
      // Matches the 'check_availability' enum in your JSON
      case "check_availability": 
        console.log("🔍 Routing to: handleCheckAvailability");
        result = await handleCheckAvailability(tenant_id, req.body);
        break;

      // Matches the 'book_appointment' enum in your JSON
      case "book_appointment":
      case "create_calendar_event": // Supporting both name variations
        console.log("📅 Routing to: handleCreateEvent");
        result = await handleCreateEvent(tenant_id, req.body);
        break;

      // Handle the case where Bolna sends 'manage_calendar' as the function name directly
      case "manage_calendar":
        console.log("🛠️ Routing to: handleCalendarOperations");
        result = await handleCalendarOperations(tenant_id, req.body);
        break;

      default:
        console.error(`❌ Unknown function_name: ${functionName}`);
        return res.status(400).json({ 
          success: false, 
          error: `Unknown function: ${functionName}` 
        });
    }

    // 4. Return success to Bolna so the AI can continue the conversation
    return res.status(200).json({ 
      success: true, 
      result 
    });

  } catch (error: any) {
    console.error("❌ Calendar Webhook Error:", error.message);
    
    // We send a 200 even on logic errors so Bolna receives the 'error' message 
    // and the AI can tell the user "I'm sorry, I'm having trouble with the calendar."
    return res.status(200).json({ 
      success: true, 
      result: { 
        error: true, 
        message: error.message || "Internal server error during calendar operation" 
      } 
    });
  }
};
async function handleCheckAvailability(tenant_id: string, parameters: any) {
  // 1. Extract and Validate Input
  const { start_time, end_time } = parameters || {};
  
  console.log(`🔍 Checking availability for Tenant: ${tenant_id}`);
  console.log(`⏰ Requested Window: ${start_time} to ${end_time}`);

  if (!start_time || !end_time) {
    console.error("❌ Missing required time parameters");
    throw new Error("start_time and end_time are required to check availability.");
  }

  try {
    // 2. Format Dates (Ensures they are valid ISO strings)
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Invalid date format provided for start_time or end_time.");
    }

    // 3. Call your core logic 
    // This assumes checkSlotAvailability handles the Google API Free/Busy check
    const availability = await checkSlotAvailability(
      tenant_id,
      startTime,
      endTime
    );

    // 4. Return formatted response for Bolna AI
    return {
      is_available: availability.isAvailable,
      message: availability.message || (availability.isAvailable ? "Slot is free." : "Slot is busy."),
      data: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        tenant_id
      }
    };

  } catch (error: any) {
    console.error("🔥 Error in handleCheckAvailability:", error.message);
    
    // Return a structured error so the AI can explain the "Technical Issue"
    return {
      is_available: false,
      message: `Could not check availability: ${error.message}`,
      error: true
    };
  }
}
/**
 * MAIN HANDLER: All creation and availability logic lives here
 */
export const handleCalendarOperations = async (tenantId: string, parameters: any) => {
  const { operation, start_time, end_time, summary, description } = parameters || {};

  if (!operation || !start_time) throw new Error("Missing operation or start_time");

  const startTime = new Date(start_time);
  let endTime = end_time ? new Date(end_time) : null;

  try {
    switch (operation) {
      case 'check_availability':
        if (!endTime) throw new Error("end_time required");
        return { success: true, result: await checkSlotAvailability(tenantId, startTime, endTime) };

      case 'create_event':
        if (!summary || !endTime) throw new Error("summary and end_time required");

        const availabilityCheck = await checkSlotAvailability(tenantId, startTime, endTime);
        if (!availabilityCheck.isAvailable) {
          return { success: false, error: `Slot taken: ${availabilityCheck.message}` };
        }

        const eventResult = await createCalendarEvent(tenantId, {
          summary,
          description: description || "Created via AI Assistant",
          startTime: start_time,
          endTime: end_time
        });

        // Save to database (event_link still stored internally, but not returned to AI)
        await logBookingToDatabase({
          tenant_id: tenantId,
          event_id: eventResult.id,
          event_link: eventResult.htmlLink, // Keep in DB for admin records
          summary,
          description: description || "Created via AI Assistant",
          start_time: startTime,
          end_time: endTime,
          duration_minutes: Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
          contact_phone: parameters.contact_phone,
          contact_name: parameters.contact_name,
          agent_id: parameters.agent_id
        });

        // Clean confirmation message - omit technical details from AI
        return { 
          success: true, 
          message: `The appointment is confirmed for ${startTime.toLocaleString()}.` 
        };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * COMPATIBILITY LAYER: Now calls handleCalendarOperations to avoid code repetition
 */
async function handleCreateEvent(tenant_id: string, parameters: any) {
  // Map legacy duration to end_time if needed
  if (!parameters.end_time && parameters.duration_minutes) {
    const start = new Date(parameters.start_time);
    parameters.end_time = new Date(start.getTime() + parameters.duration_minutes * 60 * 1000).toISOString();
  }
  
  // Forward to the main logic
  const opsResult = await handleCalendarOperations(tenant_id, {
    ...parameters,
    operation: 'create_event'
  });

  if (!opsResult.success) throw new Error(opsResult.error);
  return opsResult.result;
}

async function logBookingToDatabase(bookingData: any) {
  try {
    const booking = new Booking({
      ...bookingData,
      tenant_id: new mongoose.Types.ObjectId(bookingData.tenant_id),
      status: "scheduled"
    });
    await booking.save();
    console.log(`📝 Booking logged: ${bookingData.event_id}`);
  } catch (error: any) {
    console.error("❌ Failed to log booking:", error.message);
  }
}