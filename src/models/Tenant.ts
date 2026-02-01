import mongoose, { Schema, Document } from "mongoose";

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
    workingDays: number[]; // e.g., [1, 2, 3, 4, 5] for Mon-Fri
    startHour: number;     // e.g., 9 (9 AM)
    endHour: number;       // e.g., 17 (5 PM)
    slotDuration: number;  // e.g., 30 (minutes)
    timezone: string;
  };
}

const TenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  assignedNumber: { type: String },
  googleAuth: {
    accessToken: { type: String },
    refreshToken: { type: String },
    expiryDate: { type: Number },
    calendarId: { type: String, default: "primary" }
  },
  isCalendarLinked: { type: Boolean, default: false },
  // Default conditions for the AI booking agent
  bookingSettings: {
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    startHour: { type: Number, default: 9 },
    endHour: { type: Number, default: 17 },
    slotDuration: { type: Number, default: 30 },
    timezone: { type: String, default: "UTC" }
  }
}, { timestamps: true });

export default mongoose.model<ITenant>("Tenant", TenantSchema);