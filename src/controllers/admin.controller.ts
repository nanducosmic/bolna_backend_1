import { Request, Response } from 'express';
import User from '../models/User'; 
import Tenant from '../models/Tenant';
import Campaign from '../models/Campaign';
import CreditTransaction from '../models/CreditTransaction'; 
import CallLog from '../models/CallLog'; // Ensure you have this model

// 1. SCOPE: Super Admin -> Assign the credits
export const assignCreditsToUser = async (req: Request, res: Response) => {
  const { tenantId, amount, description } = req.body;

  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    // Update the Tenant's organizational balance
    tenant.balance = (tenant.balance || 0) + amount;
    await tenant.save();

    // Log the transaction for audit trail
    await CreditTransaction.create({
      tenant_id: tenant._id, 
      amount,
      type: 'credit',
      description: description || 'Credits assigned by Platform Admin',
      status: 'completed'
    });

    res.json({ success: true, newBalance: tenant.balance });
  } catch (error: any) {
    res.status(500).json({ message: "Failed", error: error.message });
  }
};

// 2. SCOPE: Super Admin -> Results (Dashboard Stats)
export const getAdminStats = async (_req: Request, res: Response) => {
  try {
    const [totalSubUsers, activeCampaigns, tenants] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      Campaign.countDocuments({ status: 'running' }), // Changed from 'active' to match model
      Tenant.find().select('balance')
    ]);

    const totalCreditsInSystem = tenants.reduce((acc, t) => acc + (t.balance || 0), 0);

    res.json({
      totalSubUsers,
      activeCampaigns,
      totalCreditsInSystem,
      totalTenants: tenants.length
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching stats", error: error.message });
  }
};

// 3. SCOPE: Super Admin -> List view of Clients
export const getAllSubUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find({ role: 'admin' })
      .populate('tenant_id', 'name balance')
      .select('-password')
      .sort({ createdAt: -1 });
      
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

// 4. NEW SCOPE: Super Admin -> See results (Global Call History)
// This allows you to monitor every call made on the platform
export const getGlobalCallLogs = async (req: Request, res: Response) => {
  try {
    const logs = await CallLog.find()
      .populate('tenant_id', 'name')
      .populate('agent_id', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. SCOPE: Super Admin -> Update User Balance
export const updateUserBalance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { balance } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance = balance;
    await user.save();

    res.json({ success: true, newBalance: user.balance });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update balance", error: error.message });
  }
};