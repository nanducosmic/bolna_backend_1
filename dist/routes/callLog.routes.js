"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/callLog.routes.ts
const express_1 = __importDefault(require("express"));
const callLog_controller_1 = require("../controllers/callLog.controller");
const CallLog_1 = __importDefault(require("../models/CallLog"));
const router = express_1.default.Router();
router.get("/stats", callLog_controller_1.getCallStats);
router.get("/call-logs/stats", callLog_controller_1.getCallStats); // for frontend api.ts
router.get("/contacts-summary", callLog_controller_1.getContactsSummary); // for ContactsTable
router.get("/", async (_, res) => {
    const logs = await CallLog_1.default.find().sort({ createdAt: -1 });
    res.json(logs);
});
exports.default = router;
