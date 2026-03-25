import { Router } from 'express';
import { duplicateCourse } from '../controllers/duplicateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/:courseId', authMiddleware, duplicateCourse);
export default router;
