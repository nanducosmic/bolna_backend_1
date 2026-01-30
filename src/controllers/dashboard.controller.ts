import { Request, Response } from "express";
import Contact from "../models/Contact";
import User from "../models/User";
import Agent from "../models/Agent";

export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (isSuperAdmin) {
      // --- SUPER ADMIN SCOPE ---
      const totalSubUsers = await User.countDocuments({ role: 'admin' });
      const totalAgents = await Agent.countDocuments();
      const recentContacts = await Contact.countDocuments(); // System-wide scale

      return res.json({
        totalSubUsers,
        totalAgents,
        systemHealth: "Active",
        role: "super_admin"
      });
    } else {
      // --- SUB-USER (CLIENT) SCOPE ---
      // Get counts for Successful vs Failed calls
      const callStats = await Contact.aggregate([
        { $match: { tenant_id } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      const formattedStats = {
        total: callStats.reduce((acc, curr) => acc + curr.count, 0),
        completed: callStats.find(s => s._id === 'completed')?.count || 0,
        failed: callStats.find(s => s._id === 'failed')?.count || 0,
        queued: callStats.find(s => s._id === 'queued')?.count || 0,
      };

      return res.json({
        stats: formattedStats,
        balance: req.user.balance || 0,
        role: "admin"
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};