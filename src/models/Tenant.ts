import mongoose, { Schema, Document } from "mongoose";

export interface IPrompt {
  name: string;
  text: string;
  gender: "male" | "female";
}

export interface ITenant extends Document {
  name: string;
  balance: number;
  status: "active" | "inactive";
  assignedNumber?: string;
  // Google Auth Storage
  googleAuth?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
    calendarId?: string;
  };
  isCalendarLinked: boolean;
  // SCOPE: Intervals and conditions for booking
  bookingSettings: {
    workingDays: number[];
    startHour: number;
    endHour: number;
    slotDuration: number;
    timezone: string;
  };
  // NEW: Structured Bolna Config for Multi-Tenancy
  bolnaConfig: {
    maleAgentId?: string;
    femaleAgentId?: string;
  };
  // NEW: Library of prompts for this tenant
  prompts: IPrompt[];
  assignedPhoneNumber?: string;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    assignedNumber: { type: String },
    googleAuth: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiryDate: { type: Number },
      calendarId: { type: String, default: "primary" },
    },
    isCalendarLinked: { type: Boolean, default: false },
    bookingSettings: {
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      startHour: { type: Number, default: 9 },
      endHour: { type: Number, default: 17 },
      slotDuration: { type: Number, default: 30 },
      timezone: { type: String, default: "UTC" },
    },
    // Updated Bolna Config
    bolnaConfig: {
      maleAgentId: { type: String },
      femaleAgentId: { type: String },
    },
    // Array of reusable prompts
    prompts: [
      {
        name: { type: String, required: true },
        text: { type: String, required: true },
        gender: { type: String, enum: ["male", "female"], required: true },
      },
    ],
    assignedPhoneNumber: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>("Tenant", TenantSchema);