import express from "express";

import multer from "multer";
import {
  importContactsText,
  importContactsExcel,
  getContactsList,
  downloadTemplate,
  getContactLists,
  createContactList
} from "../controllers/contact.controller";
import { protect } from "../middleware/authMiddleware"; // Ensure isolation

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add the Template Download Route
router.get("/template", protect, downloadTemplate);

// Add the Template Download Route
router.get("/template", protect, downloadTemplate);

// Protected routes (Only see your own contacts)
router.post("/import/text", protect, importContactsText);
router.post("/import/excel", protect, upload.single("file"), importContactsExcel);
// Alias for bulk import
router.post('/bulk', protect, upload.single('file'), importContactsExcel);
router.get("/", protect, getContactsList);
// --- Contact List (Folder) Management ---
// This lets the frontend show "File A", "File B", etc.

// Get all lists
router.get("/lists", protect, getContactLists);

// Get a single list by id
import { getContactListById } from "../controllers/contact.controller";
router.get("/lists/:id", protect, getContactListById);

// This lets the frontend create a new "Folder" before uploading
router.post("/lists", protect, createContactList);
export default router;