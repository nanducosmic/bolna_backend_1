import { Request, Response } from "express";
import Lead from "../models/Lead";
import { initiateCalls } from "./call.controller";

// 📂 ACTION: Fetch Meta Campaigns as Folders
export const getMetaCampaignFolders = async (req: any, res: Response) => {
  try {
    // 🛡️ SECURITY FIX: Only group leads belonging to this user's page/tenant
    const userPageId = req.user.pageId; 

    const folders = await Lead.aggregate([
      { $match: { pageId: userPageId } }, // Filter first, then group
      { $group: { 
          _id: "$adName", 
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Folder fetch failed" });
  }
};

// 🚀 ACTION: Trigger Batch Calls for a Folder
export const triggerMetaBatch = async (req: any, res: Response) => {
  const { adName, gender } = req.body;
  const userPageId = req.user.pageId; // Get tenant identifier from auth middleware

  try {
    // 🛡️ SECURITY FIX: Ensure we only find leads belonging to the logged-in tenant/page
    const leads = await Lead.find({ 
      adName, 
      status: "pending",
      pageId: userPageId 
    });

    if (leads.length === 0) return res.status(404).json({ message: "No pending leads found for this campaign." });

    const phoneNumbers = leads.map(l => l.phoneNumber);

    // 2. Mark them as 'calling' in the DB immediately (scoped to these specific IDs)
    await Lead.updateMany(
      { _id: { $in: leads.map(l => l._id) } },
      { $set: { status: "calling" } }
    );

    // 3. Reuse your existing initiateCalls logic
    req.body.recipients = phoneNumbers;
    req.body.gender = gender; // Pass the chosen gender forward
    
    return initiateCalls(req, res);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};