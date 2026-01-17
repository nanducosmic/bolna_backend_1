import mongoose, { Schema, Document } from "mongoose";

interface IContact extends Document {
  phone: string;
  status: "pending" | "called" | "connected" | "not_connected";
}

const ContactSchema = new Schema<IContact>({
  phone: { type: String, required: true, unique: true },
  status: { type: String, default: "pending" },
});

export default mongoose.model<IContact>("Contact", ContactSchema);
