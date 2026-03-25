import { Router } from 'express';
import { generateSummary } from '../controllers/summaryController';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/:courseId', authMiddleware, aiLimiter, generateSummary);
export default router;
