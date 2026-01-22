import mongoose, { Schema, Document } from "mongoose";

export interface ICallLog extends Document {
  phone: string;
  agentPrompt?: string;
  status: "initiated" | "calling" | "completed" | "connected" | "not_connected" | "failed" | "in-progress" | "no-answer" | "busy" | "test-call";
  bolnaCallId?: string;
  transcript?: string; 
  cost?: number;
  summary?: string;
  duration?: number;
  gender?: "male" | "female"; 
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
      type: String 
    },
    transcript: { 
      type: String, 
      default: "" 
    },
    duration: { 
      type: Number, 
      default: 0 
    },
    cost: {
      type: Number,
      default: 0
    },
    summary: {
      type: String,
      default: ""
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male" 
    }
  },
  { timestamps: true }
);

/** * CRITICAL ADDITION: Pagination Index
 * This ensures that sorting by newest calls (createdAt: -1) 
 * remains lightning fast even as your database grows.
 */
callLogSchema.index({ createdAt: -1 });

export default mongoose.model<ICallLog>("CallLog", callLogSchema);