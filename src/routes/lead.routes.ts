import { Router } from 'express';
import Lead from '../models/Lead';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// GET all leads for the dashboard
router.get('/all', protect, async (req, res) => {
  try {
    // Sort by -1 to show the newest Richinnovations leads at the top
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
});

export default router;