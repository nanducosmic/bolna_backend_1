import { Request, Response } from "express";
import Credit from "../models/Credit";
import CreditTransaction from "../models/CreditTransaction";

// 1. Recharge a Tenant's Wallet (Super Admin only)
export const rechargeWallet = async (req: Request, res: Response) => {
  try {
    const { tenant_id, amount, description } = req.body;

    // Update or create the credit balance
    const wallet = await Credit.findOneAndUpdate(
      { tenant_id },
      { $inc: { balance: amount }, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    // Record the transaction for history
    await CreditTransaction.create({
      tenant_id,
      amount,
      type: "CREDIT",
      description: description || "Manual Recharge"
    });

    res.json({ success: true, balance: wallet.balance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Balance for a Tenant (Client sees their own)
export const getBalance = async (req: any, res: Response) => {
  try {
    // If client, use their own ID; if Super Admin, they might pass an ID in query
    const tenantId = req.user.role === 'super_admin' ? req.query.tenant_id : req.user.tenant_id;

    const wallet = await Credit.findOne({ tenant_id: tenantId });
    res.json({ success: true, balance: wallet ? wallet.balance : 0 });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};