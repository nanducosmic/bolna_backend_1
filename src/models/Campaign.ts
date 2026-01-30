// models/Campaign.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  tenant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  list_id: mongoose.Types.ObjectId;
  title: string;
  status: "draft" | "scheduled" | "running" | "completed" | "paused";
  scheduledAt: Date;
  stats: {
    totalContacts: number;
    processed: number;
    successful: number;
    failed: number;
  };
}

const CampaignSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  agent_id: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
  list_id: { type: Schema.Types.ObjectId, ref: "ContactList", required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ["draft", "scheduled", "running", "completed", "paused"], default: "draft" },
  scheduledAt: { type: Date, required: true },
  stats: {
    totalContacts: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model<ICampaign>("Campaign", CampaignSchema);