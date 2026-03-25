import { Router } from 'express';
import { generateQuiz, getQuiz, submitQuiz } from '../controllers/quizController';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authMiddleware);
router.post('/generate/:courseId', aiLimiter, generateQuiz);
router.get('/:courseId', getQuiz);
router.post('/:courseId/submit', submitQuiz);
export default router;
