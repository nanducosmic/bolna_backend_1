import axios from "axios";

const BOLNA_API_KEY = process.env.BOLNA_API_KEY;
const MALE_AGENT_ID = process.env.BOLNA_MALE_AGENT_ID;
const FEMALE_AGENT_ID = process.env.BOLNA_FEMALE_AGENT_ID;
const BOLNA_FROM_NUMBER = process.env.BOLNA_FROM_NUMBER; // Add environment variable for from number

if (!BOLNA_API_KEY || !MALE_AGENT_ID || !FEMALE_AGENT_ID) {
  throw new Error("Required Bolna Environment Variables are missing in .env");
}


import Tenant from "../models/Tenant";

export const createBolnaCall = async (
  phone: string,
  prompt: string,
  gender: string = "male",
  tenant_id: string,
  fromPhoneNumber?: string // New parameter for purchased phone number
) => {
  try {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    // Fetch tenant config for agent selection and calendar integration
    const tenant = await Tenant.findById(tenant_id);
    if (!tenant) throw new Error("Tenant not found");

    // Use tenant.bolnaConfig for agent selection
    let selectedAgentId = undefined;
    if (tenant.bolnaConfig) {
      if (gender === "male" && tenant.bolnaConfig.maleAgentId) {
        selectedAgentId = tenant.bolnaConfig.maleAgentId;
      } else if (gender === "female" && tenant.bolnaConfig.femaleAgentId) {
        selectedAgentId = tenant.bolnaConfig.femaleAgentId;
      }
    }
    // Fallback to env if not found in tenant config
    if (!selectedAgentId) {
      selectedAgentId = gender.toLowerCase() === "male" ? MALE_AGENT_ID : FEMALE_AGENT_ID;
    }

    // Validate selectedAgentId is a UUID (v4)
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!selectedAgentId || typeof selectedAgentId !== "string" || !selectedAgentId.match(/^[0-9a-fA-F-]{36}$/)) {
      console.error(`❌ Invalid Agent ID configuration: '${selectedAgentId}' for gender '${gender}' and tenant '${tenant_id}'`);
      throw new Error(`Invalid Agent ID configuration for gender '${gender}'. Please check tenant config and environment variables.`);
    }

    console.log(`🚀 Triggering ${gender} call for tenant ${tenant_id} using Agent ID: ${selectedAgentId}`);

    // Prepare Bolna API payload with dynamic from_phone_number logic
    // Fallback: passed parameter -> environment variable -> null
    const finalFromNumber = fromPhoneNumber || BOLNA_FROM_NUMBER || null;
    
    const bolnaPayload: any = {
      agent_id: selectedAgentId,
      recipient_phone_number: formattedPhone,
      user_data: {
        prompt: prompt,
        tenant_id: tenant_id
      }
    };

    // Add from_phone_number at root level only if we have a valid number
    if (finalFromNumber) {
      bolnaPayload.from_phone_number = finalFromNumber;
      console.log('✅ Using from_phone_number:', finalFromNumber);
    } else {
      console.log('ℹ️ No from_phone_number provided, using Bolna default pool');
    }

    // Add this log to verify the structure in the terminal
    console.log('FINAL_BOLNA_PAYLOAD:', JSON.stringify(bolnaPayload, null, 2));

    const response = await axios.post('https://api.bolna.ai/call', bolnaPayload, {
      headers: { 
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Bolna API Error:", error.response?.data || error.message);
    throw error;
  }
};