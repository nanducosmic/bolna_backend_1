import { Router } from 'express';
import Lead from '../models/Lead';
import { protect, authorize } from '../middleware/authMiddleware';
import { getMetaCampaignFolders, triggerMetaBatch } from '../controllers/leadCampaign.controller';
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


// 📂 Get the "Virtual Folders"
router.get('/folders', protect, getMetaCampaignFolders);

// 🚀 Start a batch AI call for a folder
router.post('/trigger-batch', protect, authorize('admin', 'super_admin'), triggerMetaBatch);

export default router;