import { Request, Response } from "express";
import Contact from "../models/Contact";
import { createBolnaCall } from "../services/bolna.service";

export const initiateCalls = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const contacts = await Contact.find({});

    for (const contact of contacts) {
      await createBolnaCall(contact.phone, prompt);
    }

    res.json({ message: "Calls initiated successfully" });
  } catch (error: any) {
    console.error("❌ Initiate call error:", error.message);
    res.status(500).json({ message: "Failed to initiate calls" });
  }
};
