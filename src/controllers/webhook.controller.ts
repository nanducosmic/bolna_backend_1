import { Request, Response } from "express";
import { createCalendarEvent } from "../services/calendarService";
import Contact from "../models/Contact";

export const handleBolnaWebhook = async (req: Request, res: Response) => {
  // 1. Log the payload to debug your specific Bolna variable mapping
  console.log("📩 Bolna Webhook Payload:", JSON.stringify(req.body, null, 2));

  const { call_id, recipient_phone_number, variables, status } = req.body;

  // 2. Verification check
  if (status === "completed" && variables?.appointment_time) {
    try {
      // Use the recipient number to find the correct tenant/client context
      const contact = await Contact.findOne({ phone: recipient_phone_number });
      
      if (!contact) {
        console.error(`❌ No contact found for number: ${recipient_phone_number}`);
        return res.status(404).send("Contact not found");
      }

      // 3. Execution: Create the event
      await createCalendarEvent(contact.tenant_id.toString(), {
        summary: `AI Booking: ${contact.name || recipient_phone_number}`,
        startTime: variables.appointment_time, 
        // Logic: Bolna extracted time + 30 minutes
        endTime: new Date(new Date(variables.appointment_time).getTime() + 30 * 60000).toISOString(), 
        description: `Booking confirmed via AI Agent. Call ID: ${call_id}`
      });

      console.log(`✅ Event booked for Tenant: ${contact.tenant_id}`);
    } catch (error) {
      console.error("❌ Google Calendar Error:", error);
      // We still return 200 to Bolna so it doesn't keep retrying the webhook
    }
  }

  // Always respond 200 to acknowledge receipt
  res.status(200).send("Webhook Processed");
};