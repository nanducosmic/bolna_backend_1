// ...existing code...
import Tenant from "./Tenant";
/**
 * Searches for a prompt by name in both the User and Tenant models.
 * Returns { prompt, source } where source is 'user' or 'tenant'.
 */
export const getExistingPrompt = async (userId: string, tenantId: string, promptName: string, gender?: string) => {
  // Find user
  const user = await mongoose.model("User").findById(userId);
  if (user && Array.isArray(user.prompts)) {
    const found = user.prompts.find((p: any) => p.name === promptName && (!gender || p.gender === gender));
    if (found) return { prompt: found, source: "user" };
  }
  // Find tenant
  const tenant = await Tenant.findById(tenantId);
  if (tenant && Array.isArray(tenant.prompts)) {
    const found = tenant.prompts.find((p: any) => p.name === promptName && (!gender || p.gender === gender));
    if (found) return { prompt: found, source: "tenant" };
  }
  return { prompt: null, source: null };
};
// ...existing code...
// Save or update AI instructions for user or tenant
import { Request, Response } from "express";
export const saveAIInstructions = async (req: Request, res: Response) => {
  try {
    const { text, promptName, gender = "male", isCompanyDefault } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!text || !promptName || !gender) return res.status(400).json({ message: "Missing required fields." });

    // Company default: update Tenant prompts
    if (isCompanyDefault && user.role === "admin") {
      const tenant = await Tenant.findById(user.tenant_id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found." });
      // Remove any existing prompt with same name/gender
      tenant.prompts = (tenant.prompts || []).filter((p: any) => !(p.name === promptName && p.gender === gender));
      tenant.prompts.push({ name: promptName, text, gender });
      await tenant.save();
      return res.json({ success: true, scope: "tenant", prompts: tenant.prompts });
    }

    // User-level: update User prompts (must match tenant_id for security)
    if (String(user.tenant_id) !== String(req.user.tenant_id)) {
      return res.status(403).json({ message: "Forbidden: tenant mismatch." });
    }
    const dbUser = await mongoose.model("User").findById(user._id);
    if (!dbUser) return res.status(404).json({ message: "User not found." });
    dbUser.prompts = (dbUser.prompts || []).filter((p: any) => !(p.name === promptName && p.gender === gender));
    dbUser.prompts.push({ name: promptName, text, gender });
    await dbUser.save();
    return res.json({ success: true, scope: "user", prompts: dbUser.prompts });
  } catch (error: any) {
    console.error("saveAIInstructions error:", error);
    return res.status(500).json({ message: "Failed to save AI instructions", error: error.message });
  }
};
import mongoose, { Schema, Document } from "mongoose";

// This interface tells TypeScript exactly what a User object looks like

export interface IUserPrompt {
  name: string;
  text: string;
  gender: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  tenant_id: mongoose.Types.ObjectId;
  role: "super_admin" | "admin" | "user";
  balance: number;
  status: "active" | "inactive";
  isActive?: boolean;
  createdAt: Date;
  prompts?: IUserPrompt[];

  isCalendarLinked?: boolean;
  googleAuth?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
    email?: string;
    calendarId?: string;
  };
  
}


const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tenant_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: function(this: IUser) {
      return this.role === "admin" || this.role === "user";
    }
  },
  role: { 
    type: String, 
    enum: ["super_admin", "admin", "user"], 
    default: "admin" 
  },
  balance: { 
    type: Number, 
    default: 0 
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now },
  prompts: [
    {
      name: { type: String, required: true },
      text: { type: String, required: true },
      gender: { type: String, required: true }
    }
  ],


  isCalendarLinked: { type: Boolean, default: false },
  googleAuth: {
    accessToken: { type: String },
    refreshToken: { type: String },
    expiryDate: { type: Number },
    email: { type: String },
    calendarId: { type: String }
  }
});

export default mongoose.model<IUser>("User", userSchema);