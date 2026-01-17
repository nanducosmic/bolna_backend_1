"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateCalls = void 0;
const Contact_1 = __importDefault(require("../models/Contact"));
const bolna_service_1 = require("../services/bolna.service");
const initiateCalls = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: "Prompt is required" });
        }
        const contacts = await Contact_1.default.find({});
        for (const contact of contacts) {
            await (0, bolna_service_1.createBolnaCall)(contact.phone, prompt);
        }
        res.json({ message: "Calls initiated successfully" });
    }
    catch (error) {
        console.error("❌ Initiate call error:", error.message);
        res.status(500).json({ message: "Failed to initiate calls" });
    }
};
exports.initiateCalls = initiateCalls;
