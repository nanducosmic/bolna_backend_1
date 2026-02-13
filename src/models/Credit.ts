import mongoose from "mongoose";

const creditSchema = new mongoose.Schema({
  tenant_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: true,
    unique: true // One wallet per company
  },
  balance: { type: Number, default: 0 }, // Using Number for floating point precision (Direct Pass-through)
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Credit", creditSchema);