import { Router } from 'express';
import { chat } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/:courseId', authMiddleware, aiLimiter, chat);
export default router;
