import { Router } from 'express';
import { assignCreditsToUser, getAllSubUsers } from '../controllers/admin.controller';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/users', protect, adminOnly, getAllSubUsers);
router.post('/assign-credits', protect, adminOnly, assignCreditsToUser);

export default router;