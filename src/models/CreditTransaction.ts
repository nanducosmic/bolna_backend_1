import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
  description: { type: String }, // e.g., "Recharge" or "Call to +91..."
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("CreditTransaction", transactionSchema);