import { Request, Response } from "express";
import agenda from "../config/agenda";
import Campaign from "../models/Campaign";
import Contact from "../models/Contact";

export const startCampaign = async (req: any, res: Response) => {
  try {
    const { campaignId } = req.body;
    const tenant_id = req.user.tenant_id; // From your Auth middleware

    // 1. Find the campaign
    const campaign = await Campaign.findOne({ _id: campaignId, tenant_id }).populate("agent_id");
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // 2. Get all pending contacts for this campaign's list
    const contacts = await Contact.find({ list_id: campaign.list_id, tenant_id });

    // 3. Queue the calls
    // We space them out by 10 seconds so your API doesn't get banned for spamming
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      await agenda.schedule(`in ${i * 10} seconds`, "execute-campaign-call", {
        contactId: contact._id,
        bolnaAgentId: (campaign.agent_id as any).bolna_agent_id,
        tenantId: tenant_id,
        campaignId: campaign._id
      });
    }

    // 4. Update Campaign Status
    campaign.status = "running";
    await campaign.save();

    res.json({ 
      message: `Campaign started! ${contacts.length} calls are now in the queue.`,
      checkStatusAt: "/api/campaigns/status/" + campaignId 
    });

  } catch (error: any) {
    res.status(500).json({ message: "Failed to ignite campaign", error: error.message });
  }
};