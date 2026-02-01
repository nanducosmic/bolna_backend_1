import { Router } from "express";
import { 
  assignCreditsToUser, // Corrected name
  getAdminStats,       // Corrected name
  getAllSubUsers       // Corrected name
} from "../controllers/admin.controller"; 
import { protect, superAdminOnly } from "../middleware/authMiddleware";

const router = Router();

// Assign credits to a tenant
router.post("/assign-credits", protect, superAdminOnly, assignCreditsToUser);

// Get global dashboard stats
router.get("/stats", protect, superAdminOnly, getAdminStats);

// List all sub-users (Client Admins)
router.get("/sub-users", protect, superAdminOnly, getAllSubUsers);

export default router;