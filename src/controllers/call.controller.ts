import { Request, Response } from "express";
import Contact from "../models/Contact";
import CallLog from "../models/CallLog";
import { createBolnaCall } from "../services/bolna.service";

export const initiateCalls = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: "Prompt is required" });

    // FIX: Look for 'pending' (new) OR 'no-answer' (retries)
    // Also including a check for numbers with NO status at all (raw imports)
    const contactsToCall = await Contact.find({ 
      $or: [
        { status: "pending" },
        { lastStatus: "no-answer" },
        { status: { $exists: false } }, 
        { lastStatus: { $exists: false } }
      ]
    }).limit(10); // Safety limit for testing

    if (contactsToCall.length === 0) {
      return res.status(200).json({ 
        message: "No contacts ready for calling.",
        debug: "Try importing a fresh number or manually setting a status to 'pending' in DB." 
      });
    }

    // 2. Lock them to prevent duplicate triggering
    const contactIds = contactsToCall.map(c => c._id);
    await Contact.updateMany({ _id: { $in: contactIds } }, { $set: { status: "calling" } });

    // 3. Fire calls
    const results = await Promise.all(contactsToCall.map(async (contact) => {
      try {
        const response = await createBolnaCall(contact.phone, prompt);

        // Update logs and contact
        await CallLog.create({
          phone: contact.phone,
          bolnaCallId: response.execution_id,
          status: "initiated",
          agentPrompt: prompt
        });

        await Contact.findByIdAndUpdate(contact._id, { 
          status: "calling",
          lastStatus: "initiated",
          lastCallId: response.execution_id 
        });

        return { phone: contact.phone, success: true };
      } catch (err: any) {
        console.error(`Bolna API Error for ${contact.phone}:`, err.message);
        
        await Contact.findByIdAndUpdate(contact._id, { 
          status: "failed",
          lastStatus: "error"
        });

        return { phone: contact.phone, success: false, error: err.message };
      }
    }));

    res.json({ 
      message: `Attempted ${contactsToCall.length} calls.`,
      results 
    });

  } catch (error: any) {
    console.error("System Error:", error);
    res.status(500).json({ message: "System error during call initiation" });
  }
};