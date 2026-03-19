import { Router, Request, Response } from "express";
import User from "../models/User";
import Tenant from "../models/Tenant";
import { protect } from "../middleware/authMiddleware";

const router = Router();

/**
 * GET /api/tenants/:tenantId
 * Fetch tenant calendar connection status and Google email
 */
router.get("/:tenantId", async (req: any, res: Response) => {
  try {
    const { tenantId } = req.params;
    console.log("🔍 Fetching tenant status for ID:", tenantId);

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Not found' });
    
    console.log("📊 Tenant data from DB:", {
      isCalendarLinked: tenant.isCalendarLinked,
      googleEmail: tenant.googleAuth?.email
    });
    
    res.json({
      isCalendarLinked: tenant.isCalendarLinked || false,
      googleEmail: tenant.googleAuth?.email    || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/disconnect
 * Clear Google credentials and disconnect calendar
 */
router.post("/:tenantId/disconnect", protect, async (req: any, res: Response) => {
  try {
    await Tenant.findByIdAndUpdate(
      req.params.tenantId,
      { 
        $unset: { googleAuth: "" },
        $set: { isCalendarLinked: false }
      }
    );
    res.json({ success: true, message: "Disconnected successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to manually set isCalendarLinked
router.post("/:tenantId/test-connect", async (req: any, res: Response) => {
  try {
    const { tenantId } = req.params;
    console.log("🧪 Manually setting isCalendarLinked for tenant:", tenantId);
    
    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { isCalendarLinked: true } },
      { new: true }
    );
    
    console.log("🧪 Manual update result:", updated);
    res.json({ success: true, updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
