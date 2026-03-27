import axios from 'axios';

export const fetchLeadDetails = async (leadId: string) => {
  const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  // 1. Safety Check: Ensure the token exists
  if (!PAGE_ACCESS_TOKEN) {
    console.error("❌ FB_PAGE_ACCESS_TOKEN is missing in Environment Variables");
    return null;
  }

  const url = `https://graph.facebook.com/v21.0/${leadId}?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const res = await axios.get(url);
    
    // 2. Extract field_data
    // Meta returns an array like: [{ name: "full_name", values: ["Nandu Mohan"] }, ...]
    const fieldData = res.data.field_data;
    
    if (!fieldData) {
      console.warn(`⚠️ No field data found for lead: ${leadId}`);
      return null;
    }

    const data = fieldData.reduce((acc: any, field: any) => {
      acc[field.name] = field.values[0];
      return acc;
    }, {});
    
    // 3. Return a clean, normalized object
    // We use "data.full_name || data.name" because Meta field names can vary by form
  return {
      fullName: data.full_name || data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || "N/A",
      phoneNumber: data.phone_number || data.phone || data.mobile_number || "N/A",
      email: data.email || "N/A",
      metaId: leadId
    };
  } catch (error: any) {
    // 4. Enhanced Error Logging
    console.error("❌ Failed to fetch lead details:", error.response?.data || error.message);
    return null;
  }
};