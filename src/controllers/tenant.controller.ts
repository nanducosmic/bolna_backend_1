import { Request, Response } from "express";
import Tenant from "../models/Tenant";

// PATCH /api/tenants/:id/config
export const updateConfig = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bolnaAgentIds, assignedPhoneNumber } = req.body;

  if (!Array.isArray(bolnaAgentIds)) {
    return res.status(400).json({ message: "bolnaAgentIds must be an array" });
  }

  try {
    const updatedTenant = await Tenant.findByIdAndUpdate(
      id,
      {
        $set: {
          bolnaAgentIds,
          assignedPhoneNumber,
        },
      },
      { new: true }
    );
    if (!updatedTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    res.json(updatedTenant);
  } catch (error) {
    res.status(500).json({ message: "Failed to update tenant config", error });
  }
};

// POST/PATCH /api/tenants/:id/credits
export const addCredits = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  try {
    const updatedTenant = await Tenant.findByIdAndUpdate(
      id,
      { $inc: { balance: amount } },
      { new: true }
    );
    if (!updatedTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    res.json(updatedTenant);
  } catch (error) {
    res.status(500).json({ message: "Failed to add credits", error });
  }
};
