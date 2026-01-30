import mongoose from "mongoose";

const creditSchema = new mongoose.Schema({
  tenant_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: true,
    unique: true // One wallet per company
  },
  balance: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Credit", creditSchema);