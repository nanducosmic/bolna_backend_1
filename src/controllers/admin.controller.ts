import { Request, Response } from 'express';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Campaign from '../models/Campaign';
import CreditTransaction from '../models/CreditTransaction';
import CallLog from '../models/CallLog';
import mongoose from 'mongoose';

export const getTenantUsers = async (req: Request, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    if (!tenant_id) {
      return res.status(403).json({ message: "No tenant context found for user." });
    }

    const users = await User.find({ tenant_id })
      .select('-password')
      .sort({ createdAt: -1 });
      
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching tenant users", error: error.message });
  }
};

// 6. SCOPE: Super Admin -> Toggle User Status
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.tenant_id) {
      return res.status(400).json({ message: "User is missing tenant_id" });
    }
    user.isActive = !user.isActive;
    await user.save();
    return res.json(user);
  } catch (error: any) {
    console.error("toggleUserStatus error:", error);
    res.status(500).json({ message: "Failed to toggle status", error: error.message });
  }
};

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

  // 1. Validate the ID format
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    // 2. Use findById (which automatically looks for _id) 
    // We removed the 'tenant_id' filter so the Super Admin can reach anyone.
    const user = await User.findById(id);

    // 3. Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Update and Save
    user.balance = balance;
    await user.save();

    // 5. Success response
    res.json({ success: true, newBalance: user.balance });
  } catch (error: any) {
    console.error("updateUserBalance error:", error);
    res.status(500).json({ message: "Failed to update balance", error: error.message });
  }
};
// One-time migration: Assign default tenant_id and balance to users missing them

export async function migrateUsersAssignTenantAndBalance() {
  const DEFAULT_TENANT_ID = '697e57452f0b268f85262273';
  try {
    const result = await User.updateMany(
      { $or: [{ tenant_id: { $exists: false } }, { balance: { $exists: false } }] },
      { $set: { tenant_id: DEFAULT_TENANT_ID, balance: 0 } }
    );
    console.log('Migration result:', result);
    return result;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export const updateUserTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // The User's ID
    const { tenant_id } = req.body; // The New Tenant ID

    const user = await User.findByIdAndUpdate(id, { tenant_id }, { new: true });
    
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "Tenant assigned successfully", data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};