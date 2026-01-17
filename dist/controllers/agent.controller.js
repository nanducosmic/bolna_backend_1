"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgent = exports.saveAgent = void 0;
const Agent_1 = __importDefault(require("../models/Agent"));
/**
 * Create or update AI agent
 */
const saveAgent = async (req, res) => {
    try {
        const { name, prompt } = req.body;
        if (!name || !prompt) {
            return res.status(400).json({ message: "Name and prompt are required" });
        }
        // Only one agent for now (admin system)
        const agent = await Agent_1.default.findOneAndUpdate({}, { name, prompt }, { upsert: true, new: true });
        res.json({
            message: "AI Agent saved successfully",
            agent,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.saveAgent = saveAgent;
/**
 * Get AI agent
 */
const getAgent = async (_req, res) => {
    try {
        const agent = await Agent_1.default.findOne();
        res.json(agent);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAgent = getAgent;
