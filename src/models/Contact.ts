import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  tenant_id: mongoose.Types.ObjectId; // Crucial for SaaS
  list_id: mongoose.Types.ObjectId;   // Links to a specific Campaign/List
  phone: string;
  name?: string;
  status: "pending" | "calling" | "completed" | "failed" | "no-answer" | "busy";
  retryCount: number;
  lastCallId?: string;
}

const contactSchema = new Schema<IContact>({
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  list_id: { type: Schema.Types.ObjectId, ref: "ContactList", required: true },
  phone: { type: String, required: true },
  name: { type: String },
  status: { 
    type: String, 
    enum: ["pending", "calling", "completed", "failed", "no-answer", "busy"], 
    default: "pending" 
  },
  retryCount: { type: Number, default: 0 },
  lastCallId: { type: String }
}, { timestamps: true });

// This ensures a phone number is unique ONLY within the same tenant/list
contactSchema.index({ tenant_id: 1, list_id: 1, phone: 1 }, { unique: true });

export default mongoose.model<IContact>("Contact", contactSchema);