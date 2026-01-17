import { Request, Response } from "express";
import CallLog from "../models/CallLog";

/**
 * GET /api/dashboard/stats
 */
export const getCallStats = async (_req: Request, res: Response) => {
  const total = await CallLog.countDocuments();
  const connected = await CallLog.countDocuments({ status: "connected" });
  const notConnected = await CallLog.countDocuments({ status: "not_connected" });
  const initiated = await CallLog.countDocuments({ status: "initiated" });

  res.json({
    total,
    connected,
    notConnected,
    initiated,
  });
};

/**
 * POST /api/dashboard/seed
 */
export const seedDemoCalls = async (_req: Request, res: Response) => {
  await CallLog.insertMany([
    { phone: "9999999991", status: "connected" },
    { phone: "9999999992", status: "not_connected" },
    { phone: "9999999993", status: "initiated" },
  ]);

  res.json({ message: "Demo call logs inserted" });
};
