// D:\server\src\routes\tenant.routes.ts
import express from "express";
import { createTenant, getAllTenants } from "../controllers/tenantController"; // 1. Add getAllTenants
import { protect, superAdminOnly} from "../middleware/authMiddleware";

const router = express.Router();

// Existing: Create a new tenant (POST /api/tenants)
router.post("/", protect, superAdminOnly, createTenant);

// NEW: Fetch all tenants (GET /api/tenants)
// 2. This will fix the 404 error on your Admin page
router.get("/", protect, superAdminOnly, async (req, res) => {
  try {
    // If you haven't written the controller yet, you can use this temporary logic:
    // const tenants = await Tenant.find({}); 
    // res.json(tenants);
    
    // For now, let's call the controller if you have it:
    if (getAllTenants) {
        return getAllTenants(req, res);
    }
    res.json([]); // Fallback to empty list so frontend doesn't crash
  } catch (error) {
    res.status(500).json({ message: "Error fetching tenants" });
  }
});

export default router;