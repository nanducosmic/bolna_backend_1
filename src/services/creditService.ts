import Credit from "../models/Credit";
import CreditTransaction from "../models/CreditTransaction";
import mongoose from "mongoose";

/**
 * Checks if the tenant has enough credits to start a call.
 */
export const hasMinimumBalance = async (tenantId: string, threshold: number = 1) => {
  const wallet = await Credit.findOne({ tenant_id: tenantId });
  // threshold can be small (e.g., $1) just to ensure they aren't at zero
  if (!wallet || wallet.balance < threshold) {
    return false;
  }
  return true;
};

/**
 * Deducts credits safely using MongoDB's atomic $inc operator.
 * This works for BOTH Male and Female agents seamlessly.
 */
export const deductCredits = async (tenantId: string, amount: number, description: string = "Call charge") => {
  if (amount <= 0) return; // Don't process zero-cost calls

  // 1. ATOMIC UPDATE: Subtracts money directly on the database level.
  // This prevents the "Race Condition" if Male/Female agents finish at the same time.
  const wallet = await Credit.findOneAndUpdate(
    { 
      tenant_id: tenantId, 
      balance: { $gte: amount } // Safety check: only deduct if balance >= amount
    }, 
    { 
      $inc: { balance: -amount }, // Direct subtraction
      $set: { updatedAt: new Date() } 
    },
    { new: true } // Returns the updated document
  );

  if (!wallet) {
    console.error(`❌ Deduction failed for Tenant ${tenantId}: Insufficient balance or account missing.`);
    throw new Error("Insufficient credits or wallet not found.");
  }

  // 2. LOG TRANSACTION: Creates a record for the Tesla Admin to see in their history.
  await CreditTransaction.create({
    tenant_id: tenantId,
    amount: amount,
    type: "DEBIT",
    description: description, // e.g., "Bolna Call: Male Agent | +91..."
    status: "completed"
  });

  console.log(`💰 Credits Deducted: ${amount} | New Balance: ${wallet.balance} for Tenant: ${tenantId}`);
  
  return wallet.balance;
};