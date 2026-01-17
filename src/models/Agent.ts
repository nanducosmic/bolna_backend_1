import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  name: string;
  prompt: string;
  bolnaAgentId: string;
}

const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  prompt: { type: String, required: true },
  bolnaAgentId: { type: String, required: true },
});

export default mongoose.model<IAgent>("Agent", AgentSchema);
