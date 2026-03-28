import axios from 'axios';

/**
 * fetchLeadDetails
 * Orchestrates the retrieval of lead information from Meta's Graph API.
 * Optimized for Voaiz_Engine_V2 production environment.
 */
export const fetchLeadDetails = async (leadId: string) => {
  const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  // 1. Safety Check: Ensure the token exists
  if (!PAGE_ACCESS_TOKEN) {
    console.error("❌ FB_PAGE_ACCESS_TOKEN is missing in Environment Variables");
    return null;
  }

  // Using v22.0 for the latest stable features
  const url = `https://graph.facebook.com/v22.0/${leadId}?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const res = await axios.get(url);
    
    // 2. Extract field_data with Optional Chaining
    const fieldData = res.data?.field_data;
    
    if (!fieldData || !Array.isArray(fieldData)) {
      console.warn(`⚠️ No valid field data found for lead: ${leadId}`);
      return null;
    }

    /**
     * 🛡️ ARCHITECT'S FIX: 
     * We map the array to an object safely. 
     * We check if 'values' exists and has elements before accessing index [0].
     */
    const data = fieldData.reduce((acc: any, field: any) => {
      if (field.name && field.values && field.values.length > 0) {
        acc[field.name] = field.values[0];
      } else {
        acc[field.name] = "N/A"; // Fallback if field is empty
      }
      return acc;
    }, {});
    
    // 3. Return a clean, normalized object
    // Handles various naming conventions (full_name vs name vs first/last)
    return {
      fullName: data.full_name || data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || "N/A",
      phoneNumber: data.phone_number || data.phone || data.mobile_number || "N/A",
      email: data.email || "N/A",
      metaId: leadId
    };

  } catch (error: any) {
    // 4. Enhanced Error Logging for debugging in Render/Fedora
    const errorData = error.response?.data || error.message;
    console.error("❌ Failed to fetch lead details from Meta Graph API:", errorData);
    return null;
  }
};