import { Request, Response } from "express";
import CallLog from "../models/CallLog";
import Contact from "../models/Contact";
import axios from "axios";

/* ========= 1. SYNC CALL RESULTS (Multi-Agent) ========= */
export const syncCallResults = async (req: Request, res: Response) => {
  try {
    const AGENT_IDS = [
      process.env.BOLNA_FEMALE_AGENT_ID,
      process.env.BOLNA_MALE_AGENT_ID
    ].filter(Boolean);

    if (AGENT_IDS.length === 0) {
      return res.status(400).json({ message: "No Agent IDs found." });
    }

    let totalSyncedCount = 0;
    for (const agentId of AGENT_IDS) {
      const response = await axios.get(
        `https://api.bolna.ai/v2/agent/${agentId}/executions?page_size=50`, 
        { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }
      );

      const remoteCalls = response.data.data || [];
      totalSyncedCount += remoteCalls.length;

      for (const remote of remoteCalls) {
        await CallLog.findOneAndUpdate(
          { bolnaCallId: remote.id },
          {
            phone: remote.user_number,
            status: remote.status === "completed" ? "connected" : remote.status,
            duration: remote.telephony_data?.duration 
              ? Number(remote.telephony_data.duration) 
              : (remote.conversation_duration || 0),
            cost: remote.total_cost || 0,
            transcript: remote.transcript || "",
            summary: remote.summary || "No summary generated.",
            createdAt: new Date(remote.created_at || remote.initiated_at)
          },
          { upsert: true }
        );
      }
    }
    res.json({ message: `Success! Synced ${totalSyncedCount} calls.` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    res.status(500).json({ message: "Failed to pull history." });
  }
};

/* ========= 2. GET DASHBOARD STATS ========= */
export const getCallStats = async (req: Request, res: Response) => {
  try {
    const stats = await CallLog.aggregate([
      { $group: {
          _id: null,
          total: { $sum: 1 },
          connected: { $sum: { $cond: [{ $eq: ["$status", "connected"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
      }}
    ]);
    res.json(stats[0] || { total: 0, connected: 0, failed: 0 });
  } catch (error) { res.status(500).json({ message: "Error" }); }
};

/* ========= 3. GET FULL HISTORY (WITH PAGINATION & GRAND TOTAL) ========= */
export const getFullHistory = async (req: Request, res: Response) => {
  try {
    // 1. Get page and limit from request query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;


    // Only show logs for the current tenant unless super_admin
    const user = (req as any).user;
    let match = {};
    if (user?.role === "admin" && user?.tenant_id) {
      match = { tenant_id: user.tenant_id };
    }

    // If agentId is a ref, populate its name
    let history = [];
    let totalCalls = 0;
    let totalCostData = [];
    try {
      [history, totalCalls, totalCostData] = await Promise.all([
        CallLog.find(match)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        CallLog.countDocuments(match),
        CallLog.aggregate([
          { $match: match },
          { $group: { _id: null, totalBurn: { $sum: "$cost" } } }
        ])
      ]);
    } catch (err: any) {
      return res.status(500).json({ message: "Error fetching call logs", error: err?.message || String(err) });
    }

    // 3. Extract the grand total number
    const grandTotalBurn = totalCostData.length > 0 ? totalCostData[0].totalBurn : 0;

    // 4. Send back data + pagination metadata (including totalBurn)
    res.json({
      calls: history,
      pagination: {
        totalCalls,
        grandTotalBurn, // This allows the frontend to show the amazing total
        totalPages: Math.ceil(totalCalls / limit),
        currentPage: page,
        hasNextPage: skip + history.length < totalCalls,
        hasPrevPage: page > 1
      }
    });
  } catch (error) { 
    res.status(500).json({ message: "Error fetching history" }); 
  }
};

/* ========= 4. GET CONTACTS SUMMARY ========= */
export const getContactsSummary = async (req: Request, res: Response) => {
  try {
    const summary = await CallLog.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$phone",
          phone: { $first: "$phone" },
          totalCalls: { $sum: 1 },
          lastStatus: { $first: "$status" },
          lastCalledAt: { $first: "$createdAt" },
          transcript: { 
            $first: {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ["$transcript", ""] } }, 5] }, 
                "$transcript", 
                "" 
              ]
            }
          },
        }
      },
      { $sort: { lastCalledAt: -1 } },
      { $limit: 10 }
    ]);
    res.json(summary); 
  } catch (error) { res.status(500).json([]); }
};