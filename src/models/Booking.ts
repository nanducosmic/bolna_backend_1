import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  tenant_id: mongoose.Types.ObjectId;
  event_id: string; // Google Calendar event ID
  event_link: string; // Google Calendar HTML link
  summary: string;
  description: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  status: "scheduled" | "completed" | "cancelled";
  contact_phone?: string; // Phone number if available from webhook
  contact_name?: string; // Contact name if available
  agent_id?: string; // Bolna agent ID that made the booking
  created_at: Date;
  updated_at: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true // For tenant-specific queries
    },
    event_id: {
      type: String,
      required: true
    },
    event_link: {
      type: String,
      required: true
    },
    summary: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    start_time: {
      type: Date,
      required: true
    },
    end_time: {
      type: Date,
      required: true
    },
    duration_minutes: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    },
    contact_phone: {
      type: String,
      default: ""
    },
    contact_name: {
      type: String,
      default: ""
    },
    agent_id: {
      type: String,
      default: ""
    }
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Indexes for performance
bookingSchema.index({ tenant_id: 1, start_time: -1 }); // For tenant booking reports
bookingSchema.index({ event_id: 1 }, { unique: true }); // For quick event lookups

export default mongoose.model<IBooking>("Booking", bookingSchema);
