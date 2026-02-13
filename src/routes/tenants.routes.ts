import { Router, Request, Response } from "express";
import User from "../models/User";
import { protect } from "../middleware/authMiddleware";

const router = Router();

/**
 * GET /api/tenants/:tenantId
 * Fetch tenant calendar connection status and Google email
 */
router.get("/:tenantId", async (req: any, res: Response) => {
  try {
    const { tenantId } = req.params;

    const user = await User.findOne({ tenant_id: tenantId });
    if (!user) return res.status(404).json({ message: 'Not found' });
    
    res.json({
      isCalendarLinked: user.isCalendarLinked || false,
      googleEmail: user.googleAuth?.email || null
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
    await User.findOneAndUpdate(
      { tenant_id: req.params.tenantId },
      { 
        $set: { isCalendarLinked: false },
        $unset: { googleAuth: "" } 
      }
    );
    res.json({ success: true, message: "Disconnected successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
