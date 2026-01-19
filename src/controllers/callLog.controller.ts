import { Request, Response } from "express";
import CallLog from "../models/CallLog";
import Contact from "../models/Contact";
import axios from "axios";

/* ========= 1. SYNC CALL RESULTS (The "0 issue" fix) ========= */
export const syncCallResults = async (req: Request, res: Response) => {
  try {
    const AGENT_ID = "9caf93c6-3b54-4159-9cf7-4d0707550e2b"; 
    
    // Fetch last 50 calls in one go
    const response = await axios.get(
      `https://api.bolna.ai/v2/agent/${AGENT_ID}/executions?page_size=50`, 
      { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }
    );

    const remoteCalls = response.data.data || [];

    for (const remote of remoteCalls) {
      // Wise Update: Upsert logic (Update if exists, Create if new)
      await CallLog.findOneAndUpdate(
        { bolnaCallId: remote.id },
        {
          phone: remote.user_number,
          status: remote.status === "completed" ? "connected" : remote.status,
          // Use the 14s duration from telephony if available, otherwise conversation_duration
          duration: remote.telephony_data?.duration ? Number(remote.telephony_data.duration) : (remote.conversation_duration || 0),
          cost: remote.total_cost || 0, // Capturing that 3.1 precisely
          transcript: remote.transcript || "",
          summary: remote.summary || "No summary generated.",
          createdAt: new Date(remote.created_at || remote.initiated_at)
        },
        { upsert: true }
      );
    }

    res.json({ message: `Success! Synced ${remoteCalls.length} calls from Bolna.` });
  } catch (error) {
    console.error("Sync Error:", error);
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

/* ========= 3. GET FULL HISTORY ========= */
export const getFullHistory = async (req: Request, res: Response) => {
  try {
    const history = await CallLog.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (error) { res.status(500).json({ message: "Error" }); }
};


/* ========= 4. GET CONTACTS SUMMARY (FIXED FOR DASHBOARD) ========= */
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
          // Logic: Pick transcript if it exists and isn't just whitespace
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
  } catch (error) {
    res.status(500).json([]);
  }
};