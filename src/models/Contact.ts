
import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  tenant_id: mongoose.Types.ObjectId;
  list_id: mongoose.Types.ObjectId;
  phone: string;
  name: string;
  status: "pending" | "calling" | "completed" | "failed" | "no-answer" | "busy";
  retryCount: number;
  lastCallId?: string;
  source?: string;
}

const contactSchema = new Schema<IContact>({
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  list_id: { type: Schema.Types.ObjectId, ref: "ContactList", required: true },
  phone: { type: String, required: true }, // No unique here!
  name: { type: String, default: "Unknown" },
  status: {
    type: String,
    enum: ["pending", "calling", "completed", "failed", "no-answer", "busy"],
    default: "pending"
  },
  retryCount: { type: Number, default: 0 },
  lastCallId: { type: String },
  source: { type: String }
}, { timestamps: true });

// 1. THIS IS THE CORRECT COMPOUND INDEX
// It allows the same phone in different lists, but not twice in the same list.
contactSchema.index({ list_id: 1, phone: 1 }, { unique: true });

// 2. ADDITIONAL INDEX FOR PERFORMANCE (Not unique, just for speed)
contactSchema.index({ tenant_id: 1 });

const Contact = mongoose.model<IContact>("Contact", contactSchema);

// 3. THE "CLEANUP" COMMAND
// This drops any old indexes that might be lingering and causing the E11000 error
Contact.cleanIndexes().then(() => {
    console.log("Old Contact indexes cleaned. New Compound Index active.");
});

export default Contact;