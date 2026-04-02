import { Request, Response } from "express";
import Lead from "../models/Lead";
import { initiateCalls } from "./call.controller";

export const getMetaCampaignFolders = async (req: any, res: Response) => {
  try {
    // 🛡️ SECURITY: Get the Page ID from the logged-in user
    const userPageId = req.user.pageId; 

    const folders = await Lead.aggregate([
      { 
        $match: { 
          adName: { $ne: null },
          // 💡 TEMP: Comment out the line below to verify data shows up. 
          // If folders appear after commenting this, your User PageID is wrong.
          pageId: userPageId 
        } 
      },
      {
        $group: {
          _id: "$adName",
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ✅ SUCCESS RESPONSE
    return res.json({ success: true, data: folders });

  } catch (error) {
    console.error("Folder fetch error:", error);
    return res.status(500).json({ success: false, message: "Folder fetch failed" });
  }
};


// 🚀 ACTION: Trigger Batch Calls for a Folder
export const triggerMetaBatch = async (req: any, res: Response) => {
  const { adName, gender } = req.body;
  const userPageId = req.user.pageId; // From auth middleware

  try {
    // 1. Fetch leads scoped to THIS campaign AND THIS user/page
    const leads = await Lead.find({ 
      adName, 
      status: "pending",
      pageId: userPageId 
    });

    if (leads.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No pending leads found for campaign: ${adName}` 
      });
    }

    const phoneNumbers = leads.map(l => l.phoneNumber).filter(Boolean);

    // 2. Atomic Update: Mark as 'calling' to prevent double-dialing
    // We only update the specific leads we just found
    await Lead.updateMany(
      { _id: { $in: leads.map(l => l._id) } },
      { $set: { status: "calling" } }
    );

    // 3. Prepare payload for the call controller
    // We override req.body so initiateCalls has the data it expects
    req.body.recipients = phoneNumbers;
    req.body.gender = gender || 'male'; 
    
    // 4. Hand off to your existing call logic
    // Ensure initiateCalls(req, res) handles sending the final res.json
    return initiateCalls(req, res);

  } catch (error: any) {
    console.error("Batch Trigger Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Internal Server Error during batch trigger" 
    });
  }
};