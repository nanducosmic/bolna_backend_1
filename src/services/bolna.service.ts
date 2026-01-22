import axios from "axios";

const BOLNA_API_KEY = process.env.BOLNA_API_KEY;
const MALE_AGENT_ID = process.env.BOLNA_MALE_AGENT_ID;
const FEMALE_AGENT_ID = process.env.BOLNA_FEMALE_AGENT_ID;

if (!BOLNA_API_KEY || !MALE_AGENT_ID || !FEMALE_AGENT_ID) {
  throw new Error("Required Bolna Environment Variables are missing in .env");
}

export const createBolnaCall = async (
  phone: string,
  prompt: string,
  gender: string = "male"
) => {
  try {
    // 1. Format the phone number
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    
    // 2. Select the correct Agent ID based on the gender passed from the frontend
    const selectedAgentId = gender.toLowerCase() === "male" ? MALE_AGENT_ID : FEMALE_AGENT_ID;

    console.log(`🚀 Triggering ${gender} call using Agent ID: ${selectedAgentId}`);

    // 3. Make the API request
    const response = await axios.post(
      "https://api.bolna.ai/call",
      {
        agent_id: selectedAgentId,
        recipient_phone_number: formattedPhone,
        user_data: {
          prompt: prompt
        }
      },
      {
        headers: {
          Authorization: `Bearer ${BOLNA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("❌ Bolna API Error:", error.response?.data || error.message);
    throw error;
  }
};