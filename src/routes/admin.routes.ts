import { Router } from "express";
import {
  assignCreditsToUser,
  getAdminStats,
  getAllSubUsers,
  updateUserBalance,
  updateUserTenant,
  getTenantUsers
} from "../controllers/admin.controller";
import { protect, superAdminOnly, isTenantMember } from "../middleware/authMiddleware";

const router = Router();

// --- TENANT-SPECIFIC USER ROUTES ---
router.get("/users", protect, isTenantMember, getTenantUsers);

// --- SUPER ADMIN ONLY ROUTES ---
// Assign credits to a tenant
router.post("/assign-credits", protect, superAdminOnly, assignCreditsToUser);


// Update a user's balance
router.patch('/sub-users/:id/balance', protect, superAdminOnly, updateUserBalance);

// Toggle a sub-user's status
import { toggleUserStatus } from "../controllers/admin.controller";
router.patch('/sub-users/:id/status', protect, superAdminOnly, toggleUserStatus);

// Update a user's balance


// Get global dashboard stats
router.get("/stats", protect, superAdminOnly, getAdminStats);

// List all sub-users (Client Admins)
router.get("/sub-users", protect, superAdminOnly, getAllSubUsers);

router.patch('/sub-users/:id/tenant', protect, superAdminOnly, updateUserTenant);

export default router;