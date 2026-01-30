import { Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import Agent from "../models/Agent";

export const uploadToKnowledgeBase = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { agentId } = req.body; // Pass the Agent ID from the frontend
    const filePath = req.file.path;
    const form = new FormData();
    
    // 1. Prepare data for Bolna
    form.append("file", fs.createReadStream(filePath));

    // 2. Upload to Bolna API
    const response = await axios.post("https://api.bolna.ai/knowledgebase", form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.BOLNA_API_KEY}`
      }
    });

    const rag_id = response.data.rag_id;

    // 3. Link this RAG ID to your Agent in the database
    if (agentId) {
      await Agent.findByIdAndUpdate(agentId, { bolna_rag_id: rag_id });
    }

    // 4. Cleanup: Remove file from your server after upload
    fs.unlinkSync(filePath);

    res.json({ 
      message: "AI training document uploaded successfully!", 
      rag_id: rag_id 
    });

  } catch (error: any) {
    console.error("Training Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to upload training data" });
  }
};