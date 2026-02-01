import { Router } from "express";
import {
  assignCreditsToUser,
  getAdminStats,
  getAllSubUsers,
  updateUserBalance
} from "../controllers/admin.controller";
import { protect, superAdminOnly } from "../middleware/authMiddleware";

const router = Router();

// Assign credits to a tenant
router.post("/assign-credits", protect, superAdminOnly, assignCreditsToUser);

// Update a user's balance
router.patch('/users/:id/balance', protect, superAdminOnly, updateUserBalance);

// Update a user's balance
router.patch('/users/:id/balance', protect, superAdminOnly, updateUserBalance);

// Get global dashboard stats
router.get("/stats", protect, superAdminOnly, getAdminStats);

// List all sub-users (Client Admins)
router.get("/sub-users", protect, superAdminOnly, getAllSubUsers);

export default router;