import { Request, Response } from "express";
import Contact from "../models/Contact";
import User from "../models/User";

/**
 * Identify caller for incoming calls
 * Looks up user by phone number and returns customer name
 */
export const identifyCaller = async (req: Request, res: Response) => {
  try {
    const { contact_number } = req.query;
    
    if (!contact_number) {
      return res.status(400).json({ message: "Contact number is required" });
    }

    // Look up user by phone number
    const user = await User.findOne({ phone: contact_number });
    
    // Return 200 OK with customer name (fallback to "Valued Customer")
    return res.status(200).json({ 
      customer_name: user?.name || "Valued Customer" 
    });
    
  } catch (error: any) {
    console.error("Error identifying caller:", error);
    return res.status(500).json({ 
      error: "Failed to identify caller",
      message: error.message 
    });
  }
};
