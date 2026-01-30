import mongoose, { Schema, Document } from "mongoose";

// 1. Update the Interface to include bolna_rag_id
export interface IAgent extends Document {
  name: string;
  prompt: string;
  bolnaAgentId: string;
  bolna_rag_id?: string; // <--- Add this (optional because not all agents have training data)
  tenant_id: mongoose.Types.ObjectId; 
  status: "active" | "inactive";
}

// 2. Update the Schema
const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  prompt: { type: String, required: true },
  bolnaAgentId: { type: String, required: true },
  bolna_rag_id: { type: String }, // <--- Add this field here
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

// Index for multi-tenant performance
AgentSchema.index({ tenant_id: 1 });

export default mongoose.model<IAgent>("Agent", AgentSchema);