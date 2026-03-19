import { Request, Response } from "express";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList"; // 1. ADD THIS IMPORT
import XLSX from "xlsx";
import { AnyBulkWriteOperation } from "mongoose";

// --- FOLDER MANAGEMENT (The missing pieces) ---
// 4. NEW: Get a single Contact List (Folder) by ID
export const getContactListById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id;
    const list = await ContactList.findOne({ _id: id, tenant_id });
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch list", error: error.message });
  }
};

// 2. NEW: Create the "Folder" (List)
export const createContactList = async (req: any, res: Response) => {
  try {
    const { name, description } = req.body;
    const tenant_id = req.user.tenant_id;

    if (!name) return res.status(400).json({ message: "List name is required" });

    const newList = await ContactList.create({
      name,
      description,
      tenant_id,
    });

    res.status(201).json(newList);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create list", error: error.message });
  }
};

// 3. NEW: Get all "Folders" for the Journal view
export const getContactLists = async (req: any, res: Response) => {
  try {
    const tenant_id = req.user.tenant_id;
    const lists = await ContactList.find({ tenant_id }).sort({ createdAt: -1 });
    res.json(lists);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch lists", error: error.message });
  }
};

// --- EXISTING CONTACT LOGIC ---

export const downloadTemplate = (_req: Request, res: Response) => {
  const csvHeader = "name,phone,email\nJohn Doe,+919999988888,john@example.com\nJane Smith,+1234567890,jane@work.com";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');
  return res.status(200).send(csvHeader);
};

export const importContactsText = async (req: any, res: Response) => {
  try {
    const { contacts, list_id } = req.body; // Added list_id here too for consistency
    const tenant_id = req.user.tenant_id;

    if (!contacts || !contacts.trim()) return res.status(400).json({ message: "No contacts" });
    if (!list_id) return res.status(400).json({ message: "list_id required" });

    const numbers = contacts.split(/[\n,]/).map((n:string) => n.trim()).filter(Boolean);
    const uniqueNumbers = [...new Set(numbers)];

    const operations: AnyBulkWriteOperation<any>[] = uniqueNumbers.map((phone) => ({
      updateOne: {
        filter: { phone, tenant_id, list_id }, 
        update: { $set: { phone, tenant_id, list_id, status: "pending" } },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(operations);
    res.json({ message: "Imported", total: result.upsertedCount + result.modifiedCount });
  } catch (error: any) {
    res.status(500).json({ message: "Import failed", error: error.message });
  }
};

export const importContactsExcel = async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!req.body.list_id) return res.status(400).json({ message: "No list_id provided" });

    const tenant_id = req.user.tenant_id;
    const list_id = req.body.list_id;
    const source = req.file.originalname;

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    const operations: AnyBulkWriteOperation<any>[] = rows.map((row: any) => {
      // --- CHANGE IS HERE ---
      // This checks for lowercase, uppercase, and common variations
      const phone = String(row.phone || row.Phone || row.PHONE || row.contact || "").trim();
      const name = String(row.name || row.Name || row.NAME || row.Title || "Unknown").trim();
      
      // Safety check: if the phone column literally contains the word "phone", skip it
      if (!phone || phone.toLowerCase() === "phone") return null;

      return {
        updateOne: {
          filter: { phone, tenant_id, list_id },
          update: {
            $set: {
              name, // Will be "Unknown" if the name column is empty
              phone,
              tenant_id,
              list_id,
              status: "pending",
              retryCount: 0,
              source
            }
          },
          upsert: true,
        },
      };
    }).filter(Boolean) as any;

    if (operations.length === 0) {
        return res.status(400).json({ message: "No valid contacts found in file. Check your headers." });
    }

    const result = await Contact.bulkWrite(operations);
    res.json({ 
        message: "Excel imported", 
        total: (result.upsertedCount || 0) + (result.modifiedCount || 0) 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Excel import failed", error: error.message });
  }
};

export const getContactsList = async (req: any, res: Response) => {
  try {
    const { list_id } = req.query;
    const query: any = { tenant_id: req.user.tenant_id };
    if (list_id) query.list_id = list_id;

    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch", error: error.message });
  }
};