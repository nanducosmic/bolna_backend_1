// D:\server\src\controllers\tenantController.ts
import { Request, Response } from "express";
import Tenant from "../models/Tenant";
import Credit from "../models/Credit";

// --- CREATE TENANT ---
export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    // Check if tenant already exists
    const existing = await Tenant.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: "Tenant name already exists" });
    }

    // 1. Create the Client
    const tenant = await Tenant.create({ name });

    // 2. Initialize their wallet automatically with 0 credits
    await Credit.create({ tenant_id: tenant._id, balance: 0 });

    res.status(201).json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- GET ALL TENANTS (The missing piece) ---
export const getAllTenants = async (req: Request, res: Response) => {
  try {
    // Fetch all tenants and sort by newest first
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: tenants 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching tenants", 
      error: error.message 
    });
  }
};