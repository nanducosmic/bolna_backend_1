import mongoose, { Schema, Document } from "mongoose";

export interface ICallLog extends Document {
  phone: string;
  agentPrompt?: string;
  status: "initiated" | "calling" | "completed" | "connected" | "not_connected" | "failed" | "in-progress" | "no-answer" | "busy" | "test-call";
  bolnaCallId?: string;
  transcript?: string; 
  cost: number;
  summary?: string;
  duration: number;
  gender?: "male" | "female"; 
  tenant_id: mongoose.Types.ObjectId;
  source?: "user" | "tenant";
  agentName?: string;
  agent_id?: string; // Bolna agent ID for multi-agent tracking
  organization?: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

const callLogSchema = new Schema<ICallLog>(
  {
    phone: { 
      type: String, 
      required: true 
    },
    agentPrompt: { 
      type: String 
    },
    status: {
      type: String,
      enum: ["initiated", "calling", "completed", "connected", "not_connected", "failed", "in-progress", "no-answer", "busy", "test-call"],
      default: "initiated",
    },
    bolnaCallId: { 
      type: String,
      required: true,
      unique: true
    },
    transcript: { 
      type: String, 
      default: "" 
    },
    duration: { 
      type: Number, 
      default: 0,
      required: true
    },
    cost: {
      type: Number,
      default: 0,
      required: true
    },
    summary: {
      type: String,
      default: ""
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male" 
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true
    },
    source: {
      type: String,
      enum: ["user", "tenant"],
      default: "tenant"
    },
    agentName: {
      type: String,
      default: "Unknown Agent"
    },
    agent_id: {
      type: String, // Bolna agent ID (50fe0026... or 9caf93c6...)
      default: ""
    },
    organization: {
      type: String,
      default: ""
    },
    team: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

/**
 * CRITICAL ADDITION: Pagination Indexes
 * These ensure that sorting and filtering remain lightning fast 
 * even as your database grows with multi-tenant data.
 */
callLogSchema.index({ createdAt: -1 });
callLogSchema.index({ tenant_id: 1, createdAt: -1 }); // For tenant-specific queries
callLogSchema.index({ bolnaCallId: 1 }, { unique: true }); // For upsert operations

export default mongoose.model<ICallLog>("CallLog", callLogSchema);