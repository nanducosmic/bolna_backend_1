import mongoose, { Schema, Document } from "mongoose";

// This interface tells TypeScript exactly what a User object looks like
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  tenant_id: mongoose.Types.ObjectId;
  role: "super_admin" | "admin";
  balance: number; // <--- This fixes the "Property does not exist" error
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  tenant_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: true 
  },

  role: { 
    type: String, 
    enum: ["super_admin", "admin"], 
    default: "admin" 
  },

  // Add this to your schema so Mongoose knows to save it
  balance: { 
    type: Number, 
    default: 0 
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>("User", userSchema);