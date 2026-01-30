import { Request, Response } from "express";
import { createCalendarEvent } from "../services/calendarService";
import Contact from "../models/Contact";

export const handleBolnaWebhook = async (req: Request, res: Response) => {
  console.log("📩 Bolna Webhook Payload:", JSON.stringify(req.body, null, 2));

  const { call_id, recipient_phone_number, variables, status } = req.body;

  try {
    // 1. Map Bolna status to your internal Contact status
    // Scope: "View results - No of successful calls / No of failed calls"
    const contactStatus = status === "completed" ? "completed" : "failed";

    const contact = await Contact.findOneAndUpdate(
      { phone: recipient_phone_number },
      { $set: { status: contactStatus, lastCallId: call_id } },
      { new: true }
    );

    if (!contact) {
      console.error(`❌ No contact found for number: ${recipient_phone_number}`);
      return res.status(200).send("Webhook received, but no contact matched."); 
    }

    // 2. Booking Logic
    // Scope: "Booking through Google Calendar -> Set intervals and conditions"
    if (status === "completed" && variables?.appointment_time) {
      await createCalendarEvent(contact.tenant_id.toString(), {
        summary: `AI Booking: ${contact.name || recipient_phone_number}`,
        startTime: variables.appointment_time, 
        endTime: new Date(new Date(variables.appointment_time).getTime() + 30 * 60000).toISOString(), 
        description: `Booking confirmed via AI Agent. Call ID: ${call_id}`
      });
      console.log(`✅ Event booked for Tenant: ${contact.tenant_id}`);
    }

  } catch (error) {
    console.error("❌ Webhook Processing Error:", error);
  }

  res.status(200).send("Webhook Processed");
};