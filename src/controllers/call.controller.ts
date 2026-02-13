
import { Request, Response } from "express";
import Contact from "../models/Contact";
import CallLog from "../models/CallLog";
import { createBolnaCall } from "../services/bolna.service";
import { getAutomationStatus } from "../services/automationEngine";
import { hasMinimumBalance } from "../services/creditService";
import Tenant from "../models/Tenant";
import User from "../models/User";

export const initiateCalls = async (req: Request, res: Response) => {
  try {
    // Automation gatekeeper (optional, keep if needed)
    const engineStatus = await getAutomationStatus();
    if (!engineStatus.allowed) {
      return res.status(403).json({
        success: false,
        message: "Automation Engine Blocked the Request",
        reason: engineStatus.reason
      });
    }

    // Extract required fields
    const tenant_id = (req as any).user?.tenant_id;
    
    // 0. Credit Gatekeeper
    const canMakeCall = await hasMinimumBalance(tenant_id, 15); // Threshold for single call
    if (!canMakeCall) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits to initiate calls. Please recharge your organizational wallet."
      });
    }

    const { phoneNumber, recipients, gender = "male" } = req.body;
    if (!tenant_id || (!phoneNumber && !Array.isArray(recipients))) {
      return res.status(400).json({ message: "Missing tenant_id and neither phoneNumber nor recipients provided." });
    }

    // Find tenant
    const tenant = await Tenant.findById(tenant_id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    // Fetch agent from Agent collection for this tenant
    const Agent = (await import("../models/Agent")).default;
    const agent = await Agent.findOne({ tenant_id });
    if (!agent) {
      return res.status(404).json({ message: "No agent found for this tenant." });
    }

    // Get agentId for Bolna (gender-based)
    const agentId = tenant.bolnaConfig && gender === "male"
      ? tenant.bolnaConfig.maleAgentId
      : tenant.bolnaConfig && gender === "female"
        ? tenant.bolnaConfig.femaleAgentId
        : undefined;
    if (!agentId) {
      return res.status(404).json({ message: `No agentId configured for gender '${gender}' in tenant.` });
    }

    // Prepare recipients array
    const numbers = Array.isArray(recipients) ? recipients : phoneNumber ? [phoneNumber] : [];
    if (numbers.length === 0) {
      return res.status(400).json({ message: "No recipients to call." });
    }

    // Bulk trigger Bolna calls
    const results = await Promise.all(numbers.map(async (num) => {
      try {
        const response = await createBolnaCall(num, agent.prompt, gender, tenant_id);
        await CallLog.create({
          phone: num,
          bolnaCallId: response.execution_id,
          status: "initiated",
          agentPrompt: agent.prompt,
          gender,
          tenant_id,
          source: "agent",
          agentName: agent.name
        });
        return { phone: num, success: true, call_id: response.execution_id };
      } catch (err: any) {
        return { phone: num, success: false, error: err.message };
      }
    }));

    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error("System Error:", error);
    res.status(500).json({ message: "System error during call initiation" });
  }
};