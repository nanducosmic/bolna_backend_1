import { Request, Response } from "express";
import Contact from "../models/Contact";
import XLSX from "xlsx";
import { AnyBulkWriteOperation } from "mongoose";

// 1. NEW: Download Template Function
export const downloadTemplate = (_req: Request, res: Response) => {
  // Creating a CSV with Name, Phone, and Email as per your scope
  const csvHeader = "name,phone,email\nJohn Doe,+919999988888,john@example.com\nJane Smith,+1234567890,jane@work.com";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');
  return res.status(200).send(csvHeader);
};

export const importContactsText = async (req: any, res: Response) => {
  try {
    const { contacts } = req.body as { contacts: string };
    // Get tenant_id from the authenticated user (via protect middleware)
    const tenant_id = req.user.tenant_id;

    if (!contacts || !contacts.trim()) {
      return res.status(400).json({ message: "No contacts provided" });
    }

    const numbers = contacts.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
    const uniqueNumbers = [...new Set(numbers)];

    const operations: AnyBulkWriteOperation<any>[] = uniqueNumbers.map((phone) => ({
      updateOne: {
        // filter by phone AND tenant_id to keep databases separate
        filter: { phone, tenant_id }, 
        update: { $set: { phone, tenant_id, status: "queued", lastCalledAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);
    res.json({ message: "Contacts imported successfully", insertedCount: result.upsertedCount || result.modifiedCount || 0 });
  } catch (error: any) {
    res.status(500).json({ message: "Import failed", error: error.message });
  }
};

export const importContactsExcel = async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const tenant_id = req.user.tenant_id;

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    // Extracting multiple fields as per your scope (Title/Name + Phone)
    const operations: AnyBulkWriteOperation<any>[] = rows.map((row: any) => {
      const phone = String(row.phone || row.Phone || row.contact || "").trim();
      const name = String(row.name || row.Name || row.Title || "Unknown").trim();
      
      if (!phone) return null;

      return {
        updateOne: {
          filter: { phone, tenant_id },
          update: { $set: { phone, name, tenant_id, status: "queued", lastCalledAt: new Date() } },
          upsert: true,
        },
      };
    }).filter(Boolean) as any;

    const result = await Contact.bulkWrite(operations);
    res.json({ message: "Excel contacts imported", insertedCount: result.upsertedCount || 0 });
  } catch (error: any) {
    res.status(500).json({ message: "Excel import failed", error: error.message });
  }
};

export const getContactsList = async (req: any, res: Response) => {
  try {
    // Only fetch contacts belonging to this user's company
    const contacts = await Contact.find({ tenant_id: req.user.tenant_id }).sort({ lastCalledAt: -1 });
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch contacts", error: error.message });
  }
};