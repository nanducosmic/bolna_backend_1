"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoCalls = exports.getCallStats = void 0;
const CallLog_1 = __importDefault(require("../models/CallLog"));
/**
 * GET /api/dashboard/stats
 */
const getCallStats = async (_req, res) => {
    const total = await CallLog_1.default.countDocuments();
    const connected = await CallLog_1.default.countDocuments({ status: "connected" });
    const notConnected = await CallLog_1.default.countDocuments({ status: "not_connected" });
    const initiated = await CallLog_1.default.countDocuments({ status: "initiated" });
    res.json({
        total,
        connected,
        notConnected,
        initiated,
    });
};
exports.getCallStats = getCallStats;
/**
 * POST /api/dashboard/seed
 */
const seedDemoCalls = async (_req, res) => {
    await CallLog_1.default.insertMany([
        { phone: "9999999991", status: "connected" },
        { phone: "9999999992", status: "not_connected" },
        { phone: "9999999993", status: "initiated" },
    ]);
    res.json({ message: "Demo call logs inserted" });
};
exports.seedDemoCalls = seedDemoCalls;
