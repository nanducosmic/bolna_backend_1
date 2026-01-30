import Credit from "../models/Credit"; // Import the Credit model

export const deductCredits = async (tenantId: string, amount: number) => {
  // 1. Find the credit record linked to this tenant
  const wallet = await Credit.findOne({ tenant_id: tenantId });

  if (!wallet) {
    throw new Error("No credit account found for this organization. Please recharge.");
  }

  // 2. Check the balance
  if (wallet.balance < amount) {
    throw new Error("Insufficient credits");
  }

  // 3. Deduct the amount
  wallet.balance -= amount;
  
  // 4. Update the timestamp and save
  wallet.updatedAt = new Date();
  await wallet.save();

  return wallet.balance;
};