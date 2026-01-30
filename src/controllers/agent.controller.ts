import { Response } from "express";
import Agent from "../models/Agent";
import { deductCredits } from "../services/creditService"; // Import the service you just made

/**
 * Create or update AI agent for a specific Tenant
 */
export const saveAgent = async (req: any, res: Response) => {
  try {
    const { name, prompt, bolnaAgentId } = req.body;
    const tenant_id = req.user.tenant_id;

    if (!name || !prompt || !bolnaAgentId) {
      return res.status(400).json({ message: "Name, prompt, and bolnaAgentId are required" });
    }

    const agent = await Agent.findOneAndUpdate(
      { name, tenant_id }, 
      { name, prompt, bolnaAgentId, tenant_id },
      { upsert: true, new: true }
    );

    res.json({
      message: "AI Agent saved successfully for your organization",
      agent,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all AI agents belonging to the logged-in Tenant
 */
export const getAgents = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const agents = await Agent.find({ tenant_id });
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * NEW: Simulate a Call and Deduct Credits
 * This mimics what happens when an AI call finishes
 */
export const simulateCall = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const callCost = 15; // Set a fixed cost for the test

    // Use the service to check balance and deduct
    const updatedBalance = await deductCredits(tenant_id, callCost);

    res.json({
      success: true,
      message: "Call completed. Credits deducted.",
      cost: callCost,
      new_balance: updatedBalance
    });
  } catch (error: any) {
    // If the service throws "Insufficient credits", it lands here
    res.status(402).json({ success: false, message: error.message });
  }
};