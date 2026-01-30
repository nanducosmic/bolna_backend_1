import { Router } from "express";
import multer from "multer";
import { uploadToKnowledgeBase } from "../controllers/knowledgeBase.controller";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// Configure multer for temporary storage
const upload = multer({ dest: "uploads/" }); 

/**
 * Endpoint: POST /api/knowledge-base/upload
 * Only protected users can upload training data
 */
router.post("/upload", protect, upload.single("file"), uploadToKnowledgeBase);

export default router;