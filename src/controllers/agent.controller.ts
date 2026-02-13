import { Response } from "express";
import Agent from "../models/Agent";
import Contact from "../models/Contact"; // Added for Campaign logic
import { deductCredits, hasMinimumBalance } from "../services/creditService";

/**
 * Create or update AI agent + Train Agent (Prompting)
 * Scope: "Train your AI Agent - Detailed prompt"
 */
export const saveAgent = async (req: any, res: Response) => {
  try {
    const { name, prompt, bolnaAgentId, bolna_rag_id } = req.body;
    const tenant_id = req.user.tenant_id;

    // Only require name and prompt
    if (!name || !prompt || !tenant_id) {
      return res.status(400).json({ message: "Name, prompt, and tenant_id are required" });
    }

    // Upsert logic: If agent exists for this tenant, update it (Training), otherwise create.
    let agent = await Agent.findOne({ tenant_id });
    if (agent) {
      agent.name = name;
      agent.prompt = prompt;
      if (bolnaAgentId) agent.bolnaAgentId = bolnaAgentId;
      if (bolna_rag_id) agent.bolna_rag_id = bolna_rag_id;
      await agent.save();
    } else {
      agent = await Agent.create({
        name,
        prompt,
        tenant_id,
        bolnaAgentId,
        bolna_rag_id,
        status: "active",
        type: "outbound"
      });
    }

    res.json({
      message: "AI Agent/Training saved successfully",
      agent,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all AI agents belonging to the logged-in Tenant
 * Scope: "Provision to choose active agent"
 */
export const getAgents = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const filter: any = {};
    
    // Non-super_admins only see their own agents
    if (req.user.role !== "super_admin") {
      filter.tenant_id = tenant_id;
    }
    
    const agents = await Agent.find(filter);
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * START CAMPAIGN
 * Scope: "Select contact database, Select agent, Run campaign"
 */
export const startCampaign = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { agentId } = req.body; // Sub-user selects the agent

    // 0. Credit Gatekeeper (Threshold for campaign start)
    const canStart = await hasMinimumBalance(tenant_id, 150); // Threshold for 10 calls
    if (!canStart) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits to start campaign. Minimum 150 credits required."
      });
    }

    // 1. Get Agent & Queued Contacts
    const agent = await Agent.findOne({ _id: agentId, tenant_id });
    const contacts = await Contact.find({ tenant_id, status: "queued" });

    if (!agent) return res.status(404).json({ message: "Agent not found" });
    if (contacts.length === 0) return res.status(400).json({ message: "No queued contacts to call" });

    // 2. Simple execution loop (For today's scope)
    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      try {
        // Here is where you'd trigger Bolna/Vapi Outbound API
        // await triggerBolnaCall(agent.bolnaAgentId, contact.phone);
        
        contact.status = "completed"; // Mark as successful
        successCount++;
      } catch (err) {
        contact.status = "failed";
        failCount++;
      }
      await contact.save();
    }

    // 3. Deduct total credits for successful calls
    const totalCost = successCount * 15;
    const newBalance = await deductCredits(tenant_id, totalCost);

    res.json({
      success: true,
      message: "Campaign finished",
      stats: {
        total: contacts.length,
        successful: successCount,
        failed: failCount
      },
      credits_deducted: totalCost,
      remaining_balance: newBalance
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Simulate a single Call (Utility)
 */
export const simulateCall = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const callCost = 15; 
    const updatedBalance = await deductCredits(tenant_id, callCost);

    res.json({
      success: true,
      message: "Call completed. Credits deducted.",
      new_balance: updatedBalance
    });
  } catch (error: any) {
    res.status(402).json({ success: false, message: error.message });
  }
};