import express from "express";
import multer from "multer";
import { importContactsText, importContactsExcel, getContactsList } from "../controllers/contact.controller";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// TEXT import
router.post("/import/text", importContactsText);

// EXCEL import
router.post("/import/excel", upload.single("file"), importContactsExcel);

// GET contacts
router.get("/", getContactsList);

export default router;
