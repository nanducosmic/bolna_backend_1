import axios from "axios";
import CallLog from "../models/CallLog";
import { Request, Response } from "express";
// ...existing code...
/**
 * syncCallStatus: Given a Bolna execution_id, fetches execution details from Bolna API
 * and updates the local CallLog with status, duration, and cost.
 */
export const syncCallStatus = async (req: Request, res: Response) => {
  try {
    // Ensure req.body is parsed as an object
    const body = req.body as { execution_id?: string };
    const { execution_id } = body;
    if (!execution_id) {
      return res.status(400).json({ message: "Missing execution_id" });
    }

    // Call Bolna API for execution details
    const bolnaApiKey = process.env.BOLNA_API_KEY;
    const bolnaBaseUrl = process.env.BOLNA_BASE_URL || "https://api.bolna.ai";
    const response = await axios.get(
      `${bolnaBaseUrl}/v2/execution/${execution_id}`,
      {
        headers: {
          Authorization: `Bearer ${bolnaApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    const details = response.data?.data;
    if (!details) {
      return res.status(404).json({ message: "No execution details found from Bolna." });
    }

    // Update CallLog
    const update = {
      status: details.status,
      duration: details.duration || details.telephony_data?.duration || 0,
      cost: details.total_cost || 0
    };
    const updated = await CallLog.findOneAndUpdate(
      { bolnaCallId: execution_id },
      { $set: update },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "No CallLog found for this execution_id." });
    }

    return res.json({ success: true, callLog: updated });
  } catch (error) {
    console.error("syncCallStatus error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to sync call status", error: errMsg });
  }
};
// ...existing code...
import { createCalendarEvent } from "../services/calendarService";
import Contact from "../models/Contact";

export const handleBolnaWebhook = async (req: Request, res: Response) => {
  console.log("📩 Bolna Webhook Payload:", JSON.stringify(req.body, null, 2));

  const body = req.body as {
    call_id?: string;
    recipient_phone_number?: string;
    variables?: any;
    status?: string;
    user_data?: any;
  };
  const { call_id, recipient_phone_number, variables, status, user_data } = body;

  try {
    // 1. Map Bolna status to your internal Contact status
    const contactStatus = status === "completed" ? "completed" : "failed";
    const tenant_id = user_data?.tenant_id;


    // Safer logic: update only the contact with matching phone and lastCallId
    const updatedContact = await Contact.findOneAndUpdate(
      {
        phone: recipient_phone_number,
        lastCallId: call_id // Ensures we update the EXACT contact assigned to this specific call
      },
      { $set: { status: contactStatus } },
      { new: true }
    );


    if (!updatedContact) {
      console.error(`❌ No contact found for number: ${recipient_phone_number} and call_id: ${call_id}`);
      return res.status(200).send("Webhook received, but no contact matched.");
    }

    // Save CallLog with tenant_id
    await (await import("../models/CallLog")).default.create({
      phone: recipient_phone_number,
      bolnaCallId: call_id,
      status,
      tenant_id,
      agentPrompt: user_data?.prompt || "",
      transcript: variables?.transcript || "",
      summary: variables?.summary || "",
      duration: variables?.duration || 0,
      cost: variables?.cost || 0
    });

    // 2. Booking Logic
    if (status === "completed" && variables?.appointment_time) {
      await createCalendarEvent(updatedContact.tenant_id.toString(), {
        summary: `AI Booking: ${updatedContact.name || recipient_phone_number}`,
        startTime: variables.appointment_time,
        endTime: new Date(new Date(variables.appointment_time).getTime() + 30 * 60000).toISOString(),
        description: `Booking confirmed via AI Agent. Call ID: ${call_id}`
      });
      console.log(`✅ Event booked for Tenant: ${updatedContact.tenant_id}`);
    }

  } catch (error) {
    console.error("❌ Webhook Processing Error:", error);
  }

  return res.status(200).send("Webhook Processed");
};