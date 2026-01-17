import { Request, Response } from "express";
import Contact from "../models/Contact";
import XLSX from "xlsx";

/**
 * Import contacts via textarea (text copy-paste)
 */
export const importContactsText = async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body as { contacts: string };
    if (!contacts || !contacts.trim()) {
      return res.status(400).json({ message: "No contacts provided" });
    }

    // Split by newline or comma, trim, and remove empty strings
    const numbers: string[] = contacts
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);

    // Remove duplicates
    const uniqueNumbers = [...new Set(numbers)];

    // Upsert contacts safely
    const operations = uniqueNumbers.map((phone) => ({
      updateOne: {
        filter: { phone },
        update: { phone, status: "pending" },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);

    res.json({
      message: "Contacts imported successfully",
      insertedCount: result.upsertedCount || 0, // returns number of new inserts
    });
  } catch (error: any) {
    console.error("Import error:", error);
    res.status(500).json({ message: "Import failed", error: error.message });
  }
};

/**
 * Get all contacts
 */
export const getContactsList = async (_req: Request, res: Response) => {
  try {
    const contacts = await Contact.find().sort({ phone: 1 });
    res.json(contacts);
  } catch (error: any) {
    console.error("Fetch contacts error:", error);
    res.status(500).json({ message: "Failed to fetch contacts", error: error.message });
  }
};

/**
 * Import contacts via Excel upload
 */
export const importContactsExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Extract phone numbers and remove empty
    const contacts = rows
      .map((row: any) => row.phone || row.Phone || row.PHONE)
      .filter(Boolean);

    const uniqueNumbers = [...new Set(contacts)];

    // Upsert contacts safely
    const operations = uniqueNumbers.map((phone) => ({
      updateOne: {
        filter: { phone },
        update: { phone, status: "pending" },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);

    res.json({
      message: "Excel contacts imported successfully",
      insertedCount: result.upsertedCount || 0,
    });
  } catch (error: any) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: "Excel import failed", error: error.message });
  }
};
