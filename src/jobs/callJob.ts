import { Job } from "agenda";
import agenda from "../config/agenda";
import Contact from "../models/Contact";
import axios from "axios";

interface CampaignCallData {
  contactId: string;
  agentId: string;
  bolnaAgentId: string;
  tenantId: string;
}

// We use "any" or "Job" here to satisfy the function signature, 
// then cast the data inside.
agenda.define("execute-campaign-call", async (job: Job) => {
  // Cast job.attrs.data to our interface
  const data = job.attrs.data as CampaignCallData;

  if (!data) {
    console.error("Job failed: No data provided");
    return;
  }

  const { contactId, bolnaAgentId, tenantId } = data;

  try {
    // 1. Mark contact as "calling"
    await Contact.findByIdAndUpdate(contactId, { status: "calling" });

    // 2. Trigger Bolna API
    await axios.post(
      "https://api.bolna.ai/call",
      {
        agent_id: bolnaAgentId,
        recipient_phone_number: (await Contact.findById(contactId))?.phone,
        // Crucial: Keeping tenant_id context for the API call
        metadata: { tenantId } 
      },
      { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }
    );

    // 3. Update status
    await Contact.findByIdAndUpdate(contactId, { status: "completed" });
  } catch (error) {
    await Contact.findByIdAndUpdate(contactId, { status: "failed" });
    console.error(`Call failed for tenant ${tenantId}:`, error);
  }
});