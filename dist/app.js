"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const contact_routes_1 = __importDefault(require("./routes/contact.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const call_routes_1 = __importDefault(require("./routes/call.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const callLog_routes_1 = __importDefault(require("./routes/callLog.routes"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Backend API running 🚀");
});
app.use("/api/calls", call_routes_1.default); // initiate new calls
app.use("/api/agent", agent_routes_1.default); // AI agent
app.use("/api/contacts", contact_routes_1.default); // import contacts
app.use("/api/dashboard", dashboard_routes_1.default); // dashboard stats
app.use("/api/call-logs", callLog_routes_1.default); // call logs & contacts summary
exports.default = app;
