import { Request, Response } from "express";
import Tenant from "../models/Tenant";
import Credit from "../models/Credit"; // Restored the import

// @desc    Create a new Tenant & Initialize Credit Wallet
export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const existing = await Tenant.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: "Tenant name already exists" });
    }

    // 1. Create the Client
    const tenant = await Tenant.create({ name });

    // 2. Initialize their wallet automatically with 0 credits (Restored)
    // This satisfies your internal logic for a separate Credit table
    await Credit.create({ 
      tenant_id: tenant._id, 
      balance: 0 
    });

    res.status(201).json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Tenants
export const getAllTenants = async (_req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tenants });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error fetching tenants" });
  }
};

// @desc    Update booking intervals (SCOPE: Set the intervals and conditions)
export const updateBookingSettings = async (req: any, res: Response) => {
  try {
    const { workingDays, startHour, endHour, timezone, slotDuration } = req.body;
    const tenantId = req.user.tenant_id;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { 
        bookingSettings: { workingDays, startHour, endHour, timezone, slotDuration } 
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: tenant?.bookingSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};