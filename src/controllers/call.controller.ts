import { Request, Response } from "express";
import Contact from "../models/Contact";
import CallLog from "../models/CallLog";
import { createBolnaCall } from "../services/bolna.service";
// 1. Import the automation engine
import { getAutomationStatus } from "../services/automationEngine"; 

export const initiateCalls = async (req: Request, res: Response) => {
  try {
    // --- 2. THE AUTOMATION GATEKEEPER ---
    // This checks Monday-Friday, 9-6, and your Google Calendar "Break"
    const engineStatus = await getAutomationStatus();

    if (!engineStatus.allowed) {
      return res.status(403).json({ 
        success: false,
        message: "Automation Engine Blocked the Request",
        reason: engineStatus.reason // e.g., "Busy: Daily Break" or "Weekend"
      });
    }
    // ------------------------------------

    // 3. Get gender and prompt from request body
    const { prompt, gender = "male" } = req.body; 
    
    if (!prompt) return res.status(400).json({ message: "Prompt is required" });

    // FIX: Look for 'pending' (new) OR 'no-answer' (retries)
    const contactsToCall = await Contact.find({ 
      $or: [
        { status: "pending" },
        { lastStatus: "no-answer" },
        { status: { $exists: false } }, 
        { lastStatus: { $exists: false } }
      ]
    }).limit(10); 

    if (contactsToCall.length === 0) {
      return res.status(200).json({ 
        message: "No contacts ready for calling.",
        debug: "Try importing a fresh number or manually setting a status to 'pending' in DB." 
      });
    }

    // 4. Lock them to prevent duplicate triggering
    const contactIds = contactsToCall.map(c => c._id);
    await Contact.updateMany({ _id: { $in: contactIds } }, { $set: { status: "calling" } });

    // 5. Fire calls
    const results = await Promise.all(contactsToCall.map(async (contact) => {
      try {
        const response = await createBolnaCall(contact.phone, prompt, gender);

        // Update logs and contact
        await CallLog.create({
          phone: contact.phone,
          bolnaCallId: response.execution_id,
          status: "initiated",
          agentPrompt: prompt,
          gender: gender 
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
      message: `Attempted ${contactsToCall.length} calls using ${gender} voice.`,
      results 
    });

  } catch (error: any) {
    console.error("System Error:", error);
    res.status(500).json({ message: "System error during call initiation" });
  }
};