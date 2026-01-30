import { Request, Response } from 'express';
// Ensure these paths exactly match your file names (case-sensitive)
import User from '../models/User'; 
import  CreditTransaction  from '../models/CreditTransaction'; 
export const assignCreditsToUser = async (req: Request, res: Response) => {
  const { userId, amount, description } = req.body;

  try {
    // We cast to 'any' or 'IUser' to ensure TypeScript sees the new balance field
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // This now works because we added 'balance' to the User Schema/Interface
    user.balance = (user.balance || 0) + amount;
    await user.save();

    // Log the transaction
    await CreditTransaction.create({
      // IMPORTANT: Use the field name from your CreditTransaction model
      // If it's userId, use userId. If it's tenant_id, change it here:
      tenant_id: user.tenant_id, 
      amount,
      type: 'credit',
      description: description || 'Credits assigned by Admin',
      status: 'completed'
    });

    res.json({ success: true, newBalance: user.balance });
  } catch (error: any) {
    res.status(500).json({ message: "Failed", error: error.message });
  }
};

export const getAllSubUsers = async (_req: Request, res: Response): Promise<any> => {
  try {
    // Note: Ensure your User model has a 'role' field defined in the schema
    const users = await User.find({ role: 'client' }).select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};