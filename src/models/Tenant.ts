// src/models/Tenant.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  name: string;
  balance: number;
  status: "active" | "inactive";
  // New Google Auth Fields
  googleAuth?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
    calendarId?: string; // Usually 'primary'
  };
  isCalendarLinked: boolean;
}

const TenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  // Adding the storage for OAuth tokens
  googleAuth: {
    accessToken: { type: String },
    refreshToken: { type: String },
    expiryDate: { type: Number },
    calendarId: { type: String, default: "primary" }
  },
  isCalendarLinked: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<ITenant>("Tenant", TenantSchema);