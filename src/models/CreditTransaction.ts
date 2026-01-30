import mongoose, { Schema, Document } from "mongoose";

// Interface for TypeScript support
export interface ICreditTransaction extends Document {
  tenant_id: mongoose.Types.ObjectId;
  amount: number;
  type: "CREDIT" | "DEBIT";
  description: string;
  status: string; // <--- Add this
  createdAt: Date;
}

const transactionSchema = new Schema<ICreditTransaction>({
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
  description: { type: String }, 
  
  // Add status field to the schema
  status: { 
    type: String, 
    enum: ["completed", "pending", "failed"], 
    default: "completed" 
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICreditTransaction>("CreditTransaction", transactionSchema);