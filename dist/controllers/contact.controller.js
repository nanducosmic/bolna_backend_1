"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importContactsExcel = exports.getContactsList = exports.importContactsText = void 0;
const Contact_1 = __importDefault(require("../models/Contact"));
const xlsx_1 = __importDefault(require("xlsx"));
/**
 * Import contacts via textarea (text copy-paste)
 */
const importContactsText = async (req, res) => {
    try {
        const { contacts } = req.body;
        if (!contacts || !contacts.trim()) {
            return res.status(400).json({ message: "No contacts provided" });
        }
        // Split by newline or comma, trim, and remove empty strings
        const numbers = contacts
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
        const result = await Contact_1.default.bulkWrite(operations);
        res.json({
            message: "Contacts imported successfully",
            insertedCount: result.upsertedCount || 0, // returns number of new inserts
        });
    }
    catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ message: "Import failed", error: error.message });
    }
};
exports.importContactsText = importContactsText;
/**
 * Get all contacts
 */
const getContactsList = async (_req, res) => {
    try {
        const contacts = await Contact_1.default.find().sort({ phone: 1 });
        res.json(contacts);
    }
    catch (error) {
        console.error("Fetch contacts error:", error);
        res.status(500).json({ message: "Failed to fetch contacts", error: error.message });
    }
};
exports.getContactsList = getContactsList;
/**
 * Import contacts via Excel upload
 */
const importContactsExcel = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "No file uploaded" });
        const workbook = xlsx_1.default.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx_1.default.utils.sheet_to_json(sheet);
        // Extract phone numbers and remove empty
        const contacts = rows
            .map((row) => row.phone || row.Phone || row.PHONE)
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
        const result = await Contact_1.default.bulkWrite(operations);
        res.json({
            message: "Excel contacts imported successfully",
            insertedCount: result.upsertedCount || 0,
        });
    }
    catch (error) {
        console.error("Excel import error:", error);
        res.status(500).json({ message: "Excel import failed", error: error.message });
    }
};
exports.importContactsExcel = importContactsExcel;
