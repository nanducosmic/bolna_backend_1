import { Request, Response } from "express";
import agenda from "../config/agenda";
import Campaign from "../models/Campaign";
import Contact from "../models/Contact";
import mongoose from "mongoose";

// 1. SCOPE: Set Campaigns -> Select DB, Agent, and Time
export const createCampaign = async (req: any, res: Response) => {
  try {
    const { title, agent_id, list_id, scheduledAt } = req.body;
    const tenant_id = req.user.tenant_id;

    // Verify agent and list belong to the same tenant if not super_admin
    if (req.user.role !== "super_admin") {
      const Agent = await import("../models/Agent");
      const ContactList = await import("../models/ContactList");
      const [agent, list] = await Promise.all([
        Agent.default.findOne({ _id: agent_id, tenant_id }),
        ContactList.default.findOne({ _id: list_id, tenant_id })
      ]);
      if (!agent) return res.status(404).json({ message: "Agent not found or access denied." });
      if (!list) return res.status(404).json({ message: "Contact List not found or access denied." });
    }

    const campaign = await Campaign.create({
      tenant_id,
      agent_id,
      list_id,
      title,
      scheduledAt: new Date(scheduledAt),
      status: "scheduled",
      stats: { totalContacts:0, processed: 0, successful: 0, failed: 0 }
    });

    // Automatically schedule the 'startCampaign' logic using Agenda at the specific time
    await agenda.schedule(new Date(scheduledAt), "start-full-campaign", { 
      campaignId: campaign._id,
      tenant_id 
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 2. SCOPE: Run Campaign (Your existing logic refined)
export const startCampaign = async (req: any, res: Response) => {
  try {
    const { campaignId } = req.body;
    const tenant_id = req.user.tenant_id;

    const campaign = await Campaign.findOne({ _id: campaignId, tenant_id }).populate("agent_id");
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const contacts = await Contact.find({ list_id: campaign.list_id, tenant_id });

    // Spacing out calls to protect rate limits
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      await agenda.schedule(`in ${i * 10} seconds`, "execute-campaign-call", {
        contactId: contact._id,
        bolnaAgentId: (campaign.agent_id as any).bolnaAgentId, // Matches your Agent model
        tenantId: tenant_id,
        campaignId: campaign._id
      });
    }

    campaign.status = "running";
    await campaign.save();

    res.json({ message: `Campaign ignited with ${contacts.length} calls queued.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to ignite campaign", error: error.message });
  }
};