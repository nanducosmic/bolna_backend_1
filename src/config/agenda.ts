// src/config/agenda.ts
import Agenda from "agenda";
import axios from "axios";
import Contact from "../models/Contact";
import Campaign from "../models/Campaign";

const mongoConnectionString = process.env.MONGO_URI || "mongodb://127.0.0.1/your-db";

// @ts-ignore
const agenda = new Agenda({
  db: { 
    address: mongoConnectionString, 
    collection: "agendaJobs" 
  },
  processEvery: "30 seconds"
});

// --- JOB DEFINITIONS ---

/**
 * SCOPE: Run Campaign
 * This worker executes the actual call for a single contact.
 */
agenda.define("execute-campaign-call", async (job: any) => {
  const { contactId, bolnaAgentId, campaignId } = job.attrs.data;

  try {
    const contact = await Contact.findById(contactId);
    if (!contact) return;

    // Trigger Bolna API (or your chosen Voice provider)
    await axios.post(`https://api.bolna.io/v1/call`, {
      agent_id: bolnaAgentId,
      recipient_phone_number: contact.phone,
      recipient_data: { first_name: contact.name }
    }, {
      headers: { 'Authorization': `Bearer ${process.env.BOLNA_API_KEY}` }
    });

    // Update Campaign Stats: Success
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.processed": 1, "stats.successful": 1 }
    });

  } catch (error: any) {
    console.error(`Call failed for ${contactId}:`, error.message);
    
    // Update Campaign Stats: Failure
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.processed": 1, "stats.failed": 1 }
    });
  }
});

/**
 * Starts the Agenda process
 */
(async function() {
  await agenda.start();
  console.log("Agenda worker started successfully");
})();

export default agenda;