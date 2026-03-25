import { Router } from 'express';
import { getProgress, updateProgress } from '../controllers/progressController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/:courseId', authMiddleware, getProgress);
router.put('/:courseId', authMiddleware, updateProgress);
export default router;
