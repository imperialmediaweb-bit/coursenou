import { Router } from 'express';
import { getStats, addXP } from '../controllers/gamificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/stats', authMiddleware, getStats);
router.post('/xp', authMiddleware, addXP);
export default router;
