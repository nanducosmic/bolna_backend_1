import { Request, Response } from "express";
import Contact from "../models/Contact";
import XLSX from "xlsx";
import { AnyBulkWriteOperation } from "mongoose";

export const importContactsText = async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body as { contacts: string };
    if (!contacts || !contacts.trim()) {
      return res.status(400).json({ message: "No contacts provided" });
    }

    const numbers: string[] = contacts
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);

    const uniqueNumbers = [...new Set(numbers)];

    const operations: AnyBulkWriteOperation<any>[] = uniqueNumbers.map((phone) => ({
      updateOne: {
        filter: { phone },
        update: { $set: { phone, status: "queued", lastCalledAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);

    res.json({
      message: "Contacts imported successfully",
      insertedCount: result.upsertedCount || result.modifiedCount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Import failed", error: error.message });
  }
};

export const importContactsExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    const contacts = rows
      .map((row: any) => row.phone || row.Phone || row.PHONE || row.contact)
      .filter(Boolean)
      .map(n => String(n).trim());

    const uniqueNumbers = [...new Set(contacts)];

    const operations: AnyBulkWriteOperation<any>[] = uniqueNumbers.map((phone) => ({
      updateOne: {
        filter: { phone },
        update: { $set: { phone, status: "queued", lastCalledAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);

    res.json({
      message: "Excel contacts imported successfully",
      insertedCount: result.upsertedCount || result.modifiedCount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Excel import failed", error: error.message });
  }
};

/**
 * MISSING FUNCTION ADDED HERE:
 * This will fix the "argument handler must be a function" error
 */
export const getContactsList = async (_req: Request, res: Response) => {
  try {
    const contacts = await Contact.find().sort({ lastCalledAt: -1 });
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch contacts", error: error.message });
  }
};