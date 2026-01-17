import express from "express";
import cors from "cors";
import contactRoutes from "./routes/contact.routes";
import agentRoutes from "./routes/agent.routes";
import callRoutes from "./routes/call.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import callLogRoutes from "./routes/callLog.routes";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend API running 🚀");
});

app.use("/api/calls", callRoutes);          // initiate new calls
app.use("/api/agent", agentRoutes);         // AI agent
app.use("/api/contacts", contactRoutes);    // import contacts
app.use("/api/dashboard", dashboardRoutes); // dashboard stats
app.use("/api/call-logs", callLogRoutes);   // call logs & contacts summary

export default app;
