"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactsSummary = exports.getCallStats = void 0;
const CallLog_1 = __importDefault(require("../models/CallLog"));
/* ========= GET DASHBOARD CALL STATS ========= */
const getCallStats = async (req, res) => {
    try {
        const stats = await CallLog_1.default.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const result = {
            initiated: 0,
            connected: 0,
            not_connected: 0,
            failed: 0,
        };
        stats.forEach((s) => {
            result[s._id] = s.count;
        });
        res.json(result);
    }
    catch (error) {
        console.error("Failed to fetch call stats:", error);
        res.status(500).json({ message: "Failed to fetch call stats" });
    }
};
exports.getCallStats = getCallStats;
/* ========= GET DASHBOARD CONTACTS SUMMARY ========= */
const getContactsSummary = async (req, res) => {
    try {
        const summary = await CallLog_1.default.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$phone",
                    phone: { $first: "$phone" },
                    totalCalls: { $sum: 1 },
                    lastStatus: { $first: "$status" },
                    lastCalledAt: { $first: "$createdAt" },
                },
            },
            { $sort: { lastCalledAt: -1 } },
        ]);
        res.json(summary);
    }
    catch (error) {
        console.error("Failed to fetch contacts summary:", error);
        res.status(500).json({ message: "Failed to fetch contacts summary" });
    }
};
exports.getContactsSummary = getContactsSummary;
