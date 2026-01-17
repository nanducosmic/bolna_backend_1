// controllers/callLog.controller.ts
import { Request, Response } from "express";
import CallLog from "../models/CallLog";

type CallStatus = "initiated" | "connected" | "not_connected" | "failed";

/* ========= GET DASHBOARD CALL STATS ========= */
export const getCallStats = async (req: Request, res: Response) => {
  try {
    const stats: { _id: CallStatus; count: number }[] = await CallLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result: Record<CallStatus, number> = {
      initiated: 0,
      connected: 0,
      not_connected: 0,
      failed: 0,
    };

    stats.forEach((s) => {
      result[s._id] = s.count;
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch call stats:", error);
    res.status(500).json({ message: "Failed to fetch call stats" });
  }
};

/* ========= GET DASHBOARD CONTACTS SUMMARY ========= */
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
        },
      },
      { $sort: { lastCalledAt: -1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error("Failed to fetch contacts summary:", error);
    res.status(500).json({ message: "Failed to fetch contacts summary" });
  }
};
