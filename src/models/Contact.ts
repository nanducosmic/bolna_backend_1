import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  phone: string;
  name?: string;
  status: "pending" | "calling" | "completed" | "failed" | "no-answer" | "busy";
  retryCount: number;
  lastCallId?: string;
}

const contactSchema = new Schema<IContact>({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  status: { 
    type: String, 
    enum: ["pending", "calling", "completed", "failed", "no-answer", "busy"], 
    default: "pending" 
  },
  retryCount: { type: Number, default: 0 },
  lastCallId: { type: String }
}, { timestamps: true });

export default mongoose.model<IContact>("Contact", contactSchema);