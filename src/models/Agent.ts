import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  name: string;
  prompt: string;
  bolnaAgentId: string;
  bolna_rag_id?: string;        // SCOPE: Reference document upload
  negative_prompts?: string;    // SCOPE: Negative prompts or don't dos
  cta?: string;                 // SCOPE: CTA (Call to Action)
  assigned_number?: string;     // SCOPE: Admin feasibility for numbers
  type: "inbound" | "outbound"; // SCOPE: Marking inbound or outbound
  tenant_id: mongoose.Types.ObjectId; 
  status: "active" | "inactive";
}

const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  prompt: { type: String, required: true },
  bolnaAgentId: { type: String, required: true },
  bolna_rag_id: { type: String }, 
  negative_prompts: { type: String },
  cta: { type: String },
  assigned_number: { type: String },
  type: { 
    type: String, 
    enum: ["inbound", "outbound"], 
    default: "outbound" 
  },
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

// Indexing for performance in multi-tenant queries
AgentSchema.index({ tenant_id: 1 });

export default mongoose.model<IAgent>("Agent", AgentSchema);