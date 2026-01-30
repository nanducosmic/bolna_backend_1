import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Link to the Tenant (Company)
  tenant_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: true 
  },

  role: { 
    type: String, 
    enum: ["super_admin", "admin"], // super_admin (You), admin (Your Client)
    default: "admin" 
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);