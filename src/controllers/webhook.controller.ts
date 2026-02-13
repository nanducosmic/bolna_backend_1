import axios from "axios";
import CallLog from "../models/CallLog";
import { Request, Response } from "express";
import { createCalendarEvent } from "../services/calendarService";
import Contact from "../models/Contact";
import { calendarWebhook } from "./calendar.controller";

/**
 * syncCallStatus: Keeps your manual sync logic working perfectly.
 */
export const syncCallStatus = async (req: Request, res: Response) => {
  try {
    const { execution_id } = req.body as { execution_id?: string };
    if (!execution_id) return res.status(400).json({ message: "Missing execution_id" });

    const bolnaApiKey = process.env.BOLNA_API_KEY;
    const bolnaBaseUrl = process.env.BOLNA_BASE_URL || "https://api.bolna.ai";
    const response = await axios.get(`${bolnaBaseUrl}/v2/execution/${execution_id}`, {
        headers: { Authorization: `Bearer ${bolnaApiKey}`, "Content-Type": "application/json" }
    });
    
    const details = response.data?.data;
    if (!details) return res.status(404).json({ message: "No execution details found from Bolna." });

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

    if (updated && updated.tenant_id) {
      const durationInMinutes = (update.duration || 0) / 60;
      const creditCost = Math.ceil(durationInMinutes * 15);
      const { deductCredits } = await import("../services/creditService");
      await deductCredits(updated.tenant_id.toString(), creditCost, `Manual Sync: ${Math.round(update.duration)}s`);
    }

    return res.json({ success: true, callLog: updated });
  } catch (error) {
    console.error("syncCallStatus error:", error);
    return res.status(500).json({ message: "Failed to sync" });
  }
};

/**
 * handleBolnaWebhook: Perfect multi-tenant data collection with tenant_id extraction.
 * UPDATED to capture costs from both 'connected' and 'completed' statuses.
 */
export const handleBolnaWebhook = async (req: Request, res: Response) => {
  console.log("📩 Processing Voice AI Webhook:", JSON.stringify(req.body, null, 2));

  const { 
    id: call_id, 
    user_number: raw_phone, 
    status, 
    conversation_duration: duration, 
    total_cost: bolna_cost,
    transcript,
    context_details,
    extracted_data,
    agent_id
  } = req.body;

  const normalized_phone = raw_phone?.replace(/^\+91/, "");

  // Dynamic Tenant ID Extraction (Hierarchy of Truth)
  let tenant_id = 
    req.headers['x-tenant-id'] || // 1. Check custom headers
    context_details?.recipient_data?.tenant_id || // 2. Check call metadata
    req.body.parameters?.tenant_id; // 3. Check tool-specific parameters

  // Fallback & Validation
  if (!tenant_id || tenant_id === "YOUR_TENANT_ID_HERE" || tenant_id === undefined || tenant_id === null) {
    console.error("❌ Unidentified Tenant: No valid tenant_id found in request");
    return res.status(400).json({ error: "Unidentified Tenant" });
  }

  // Log identified tenant_id for debugging
  console.log(`🏢 Identified Tenant ID: ${tenant_id}`);

  const orgName = context_details?.recipient_data?.organization || "Tesla";
  const teamName = context_details?.recipient_data?.team || "General";
  const agentPrompt = context_details?.recipient_data?.prompt || "";

  try {
    // 1. Update contact status
    const contactStatus = status === "completed" || status === "connected" ? "completed" : "failed";
    const updatedContact = await Contact.findOneAndUpdate(
      { phone: normalized_phone, lastCallId: call_id },
      { $set: { status: contactStatus } },
      { new: true }
    );

    // 2. Save/Update call log (Upsert ensures we catch cost whether it comes in 'connected' or 'completed')
    await CallLog.findOneAndUpdate(
      { bolnaCallId: call_id },
      {
        phone: normalized_phone || raw_phone,
        status,
        tenant_id,
        organization: orgName,
        team: teamName,
        agentPrompt,
        agent_id,
        transcript: transcript || "",
        duration: Number(duration) || 0,
        cost: Number(bolna_cost) || 0
      },
      { upsert: true }
    );

    // 3. UPDATED BILLING RULE: If cost > 0, deduct credits regardless of status string
    // This solves the issue where 'connected' had money but 'completed' had $0
    if (tenant_id && Number(bolna_cost) > 0) {
      const agentLabel = agent_id === process.env.BOLNA_MALE_AGENT_ID ? "Male Agent" : "Female Agent";
      
      try {
        const { deductCredits } = await import("../services/creditService");
        await deductCredits(
          tenant_id.toString(),
          Number(bolna_cost),
          `Bolna Call (${status}): ${agentLabel} | ${orgName} | ${Math.round(Number(duration))}s`
        );
      } catch (creditError: any) {
        console.error("⚠️ Credit Deduction Failed:", creditError.message);
      }
    }

    // 4. Handle Calendar Tool Operations
    // Check if this is a calendar tool call from Bolna
    if (req.body.function_name || (req.body.function_call && req.body.function_call.name === "calendar_operations")) {
      console.log("📅 Calendar tool detected, delegating to calendar handler");
      try {
        // Forward to calendar handler but don't return its response
        // We need to ensure this webhook still returns 200 OK to Bolna
        await calendarWebhook(req, res);
        console.log("✅ Calendar operations completed");
      } catch (calendarError: any) {
        console.error("❌ Calendar operations failed:", calendarError.message);
        // Continue processing even if calendar fails
      }
    }

    // 5. Handle Legacy AI booking (for backward compatibility)
    const appointment_time = extracted_data?.appointment_time;
    if (appointment_time && tenant_id) {
      await createCalendarEvent(tenant_id.toString(), {
        summary: `AI Booking: ${updatedContact?.name || normalized_phone}`,
        startTime: appointment_time,
        endTime: new Date(new Date(appointment_time).getTime() + 30 * 60000).toISOString(),
        description: `Confirmed via AI. Call ID: ${call_id} | Agent: ${agent_id}`
      });
    }

    console.log(`✅ Webhook Processed: ${call_id} | Status: ${status} | Cost: ${bolna_cost}`);

  } catch (error) {
    console.error("❌ Webhook Processing Error:", error);
    return res.status(500).json({ message: "Failed to process webhook" });
  }

  // Always return 200 OK to prevent Bolna retries
  return res.status(200).send("Webhook processed successfully");
};