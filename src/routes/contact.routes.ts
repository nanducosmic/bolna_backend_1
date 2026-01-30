import express from "express";
import multer from "multer";
import { 
  importContactsText, 
  importContactsExcel, 
  getContactsList,
  downloadTemplate // <-- Add this
} from "../controllers/contact.controller";
import { protect } from "../middleware/authMiddleware"; // Ensure isolation

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add the Template Download Route
router.get("/template", protect, downloadTemplate);

// Protected routes (Only see your own contacts)
router.post("/import/text", protect, importContactsText);
router.post("/import/excel", protect, upload.single("file"), importContactsExcel);
router.get("/", protect, getContactsList);

export default router;