import { Request, Response } from "express";
import CallLog from "../models/CallLog";
import Contact from "../models/Contact";
import axios from "axios";
import mongoose from "mongoose";

/* ========= 1. SYNC CALL RESULTS (Multi-Agent with Tenant Injection) ========= */
export const syncCallResults = async (req: Request, res: Response) => {
  try {
    // Get current user's tenant_id to inject into synced records
    const user = (req as any).user;
    const currentTenantId = user?.tenant_id;
    
    if (!currentTenantId) {
      return res.status(400).json({ message: "User tenant_id required for sync" });
    }

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
              : Number(remote.conversation_duration || 0),
            cost: Number(remote.total_cost || 0),
            transcript: remote.transcript || "",
            summary: remote.summary || "No summary generated.",
            tenant_id: new mongoose.Types.ObjectId(currentTenantId), // INJECT current user's tenant_id
            createdAt: new Date(remote.created_at || remote.initiated_at)
          },
          { upsert: true }
        );
      }
    }
    res.json({ message: `Success! Synced ${totalSyncedCount} calls for tenant ${currentTenantId}.` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    res.status(500).json({ message: "Failed to pull history." });
  }
};

/* ========= 2. GET DASHBOARD STATS (TENANT-ISOLATED) ========= */
export const getCallStats = async (req: Request, res: Response) => {
  try {
    // Build tenant filter based on user role
    const user = (req as any).user;
    let match: any = {};
    
    if (user?.role !== "super_admin") {
      match = { tenant_id: new mongoose.Types.ObjectId(user.tenant_id) };
    } else if (req.query.tenant_id) {
      match = { tenant_id: new mongoose.Types.ObjectId(req.query.tenant_id as string) };
    }

    const stats = await CallLog.aggregate([
      { $match: match },
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

/* ========= 3. GET FULL HISTORY (PERFECT ROLE-BASED FILTERING & TOTAL BURN) ========= */
export const getFullHistory = async (req: Request, res: Response) => {
  try {
    // 1. Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // 2. DETECT USER ROLE FROM JWT and build tenant filter
    const user = (req as any).user;
    let match: any = {};
    
    // For 'Admin' role (Tesla): Strictly filter by tenant_id - includes BOTH agents
    if (user?.role !== "super_admin") {
      match = { tenant_id: new mongoose.Types.ObjectId(user.tenant_id) };
    } 
    // For 'Super Admin': Allow viewing all calls globally OR filter by specific tenant
    else if (req.query.tenant_id) {
      match = { tenant_id: new mongoose.Types.ObjectId(req.query.tenant_id as string) };
    }

    // 3. PARALLEL QUERIES for performance
    let [history, totalCalls, totalCostData] = await Promise.all([
      CallLog.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean for better performance
      CallLog.countDocuments(match),
      // MongoDB aggregation for total burn calculation specifically for that tenant_id
      CallLog.aggregate([
        { $match: match },
        { $group: { _id: null, totalBurn: { $sum: "$cost" } } }
      ])
    ]);

    // 4. Extract grand total burn for the tenant
    const grandTotalBurn = totalCostData.length > 0 ? totalCostData[0].totalBurn : 0;

    // 5. Return paginated results with total burn
    res.json({
      calls: history,
      pagination: {
        totalCalls,
        grandTotalBurn, // Total burn for this tenant (Tesla sees only Tesla costs)
        totalPages: Math.ceil(totalCalls / limit),
        currentPage: page,
        hasNextPage: skip + history.length < totalCalls,
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    console.error("getFullHistory error:", error);
    res.status(500).json({ 
      message: "Error fetching call history", 
      error: error?.message || String(error) 
    });
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