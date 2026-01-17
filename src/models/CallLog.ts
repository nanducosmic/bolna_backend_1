import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    agentPrompt: {
      type: String,
    },
    status: {
      type: String,
      enum: ["initiated", "connected", "not_connected", "failed"],
      default: "initiated",
    },
    bolnaCallId: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
