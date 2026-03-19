import mongoose, { Schema, Document } from "mongoose";

export interface IContactList extends Document {
  name: string;      // This will store "File A" or "Marketing Leads"
  tenant_id: mongoose.Types.ObjectId;
  description?: string;
}

const contactListSchema = new Schema<IContactList>({
  name: { type: String, required: true },
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model<IContactList>("ContactList", contactListSchema);