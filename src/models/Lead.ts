import mongoose, { Schema, Document } from 'mongoose';

/**
 * ILead Interface
 * Defines the TypeScript shape for our Lead documents.
 * Added 'email' to match the Meta Service response.
 */
export interface ILead extends Document {
  leadId: string;        // The leadgen_id from Meta
  adId?: string;         // The ad_id (optional to prevent validation crashes)
  formId?: string;       // The form_id
  pageId?: string;       // The page_id (Richinnovations)
  fullName: string;      // Fetched via Graph API
  phoneNumber: string;   // Fetched via Graph API
  email?: string;        // 📧 Added for Richinnovations lead capture
  status: 'pending' | 'calling' | 'completed' | 'failed';
  createdAt: Date;
}

/**
 * Lead Schema
 * The Mongoose definition for the 'leads' collection.
 */
const LeadSchema: Schema = new Schema({
  leadId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  adId: { type: String },
  formId: { type: String },
  pageId: { type: String },
  fullName: { 
    type: String, 
    default: 'Pending Fetch' 
  },
  phoneNumber: { 
    type: String, 
    default: 'Pending Fetch' 
  },
  email: { 
    type: String 
  }, // 📧 Added to the database structure
  status: { 
    type: String, 
    enum: ['pending', 'calling', 'completed', 'failed'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create an index on leadId for faster lookups since we'll be 
// searching for this every time Meta pings us.
LeadSchema.index({ leadId: 1 });

export default mongoose.model<ILead>('Lead', LeadSchema);