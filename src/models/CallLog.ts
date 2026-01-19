import mongoose, { Schema, Document } from "mongoose";

export interface ICallLog extends Document {
  phone: string;
  agentPrompt?: string;
  // Added 'test-call' to the status list
  status: "initiated" | "calling" | "completed" | "connected" | "not_connected" | "failed" | "in-progress" | "no-answer" | "busy" | "test-call";
  bolnaCallId?: string;
  transcript?: string; 
  cost?: number;
  summary?: string;
  duration?: number;
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
      // Added 'test-call' and 'connected' here to match your dashboard logic
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
    // ADDED THESE TWO:
    cost: {
      type: Number,
      default: 0
    },
    summary: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export default mongoose.model<ICallLog>("CallLog", callLogSchema);