import agenda from "../config/agenda";
import Contact from "../models/Contact";
import axios from "axios";

agenda.define("execute-campaign-call", async (job: any) => {
  const { contactId, agentId, bolnaAgentId, tenantId } = job.attrs.data;



  try {

    // 1. Mark contact as "calling"

    await Contact.findByIdAndUpdate(contactId, { status: "calling" });



    // 2. Trigger Bolna API

    await axios.post(

      "https://api.bolna.ai/call",

      {

        agent_id: bolnaAgentId,

        recipient_phone_number: (await Contact.findById(contactId))?.phone,

      },

      { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }

    );



    // 3. Update status

    await Contact.findByIdAndUpdate(contactId, { status: "completed" });

  } catch (error) {

    await Contact.findByIdAndUpdate(contactId, { status: "failed" });

    console.error("Call failed for contact:", contactId);

  }

});