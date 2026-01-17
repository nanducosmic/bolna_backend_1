import { Request, Response } from "express";
import Agent from "../models/Agent";

/**
 * Create or update AI agent
 */
export const saveAgent = async (req: Request, res: Response) => {
  try {
    const { name, prompt } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({ message: "Name and prompt are required" });
    }

    // Only one agent for now (admin system)
    const agent = await Agent.findOneAndUpdate(
      {},
      { name, prompt },
      { upsert: true, new: true }
    );

    res.json({
      message: "AI Agent saved successfully",
      agent,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get AI agent
 */
export const getAgent = async (_req: Request, res: Response) => {
  try {
    const agent = await Agent.findOne();

    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
