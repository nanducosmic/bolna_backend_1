// D:\server\src\routes\credit.routes.ts
import express from "express";
import { rechargeWallet, getBalance } from "../controllers/creditController";
import { protect, superAdminOnly } from "../middleware/authMiddleware";

const router = express.Router();

// 1. Existing: Only Super Admin can add money
router.post("/recharge", protect, superAdminOnly, rechargeWallet);

// 2. Existing: Anyone logged in can check their own balance
router.get("/balance", protect, getBalance);

// 3. NEW: Add this to fix the 404 error
// This matches: GET /api/credits/history
router.get("/history", protect, async (req, res) => {
  try {
    // For now, let's return an empty array so the frontend doesn't crash.
    // Later, you can fetch actual data from a 'Transactions' collection.
    res.json([]); 
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

export default router;