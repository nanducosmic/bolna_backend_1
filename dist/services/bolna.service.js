"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBolnaCall = void 0;
const axios_1 = __importDefault(require("axios"));
const BOLNA_API_KEY = process.env.BOLNA_API_KEY;
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID;
const BOLNA_FROM_NUMBER = process.env.BOLNA_FROM_NUMBER;
if (!BOLNA_API_KEY)
    throw new Error("Bolna API Key missing");
if (!BOLNA_AGENT_ID)
    throw new Error("Bolna Agent ID missing");
const createBolnaCall = async (phone, prompt) => {
    try {
        const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
        const response = await axios_1.default.post("https://api.bolna.ai/call", // ✅ WORKING ENDPOINT (OLD but STABLE)
        {
            agent_id: BOLNA_AGENT_ID,
            recipient_phone_number: formattedPhone,
            user_data: {
                prompt, // ✅ MUST MATCH {{prompt}} in dashboard
            },
        }, {
            headers: {
                Authorization: `Bearer ${BOLNA_API_KEY}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("❌ Bolna API Error:", error.response?.data || error.message);
        throw error;
    }
};
exports.createBolnaCall = createBolnaCall;
