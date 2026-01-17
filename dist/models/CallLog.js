"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const callLogSchema = new mongoose_1.default.Schema({
    phone: {
        type: String,
        required: true,
    },
    agentPrompt: {
        type: String,
    },
    status: {
        type: String,
        enum: ["initiated", "connected", "not_connected", "failed"],
        default: "initiated",
    },
    bolnaCallId: {
        type: String,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("CallLog", callLogSchema);
