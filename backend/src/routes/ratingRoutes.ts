import { Router } from 'express';
import { rateCourse, getCourseRating, getCourseRatings } from '../controllers/ratingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/:courseId', authMiddleware, rateCourse);
router.get('/:courseId', authMiddleware, getCourseRating);
router.get('/:courseId/all', authMiddleware, getCourseRatings);
export default router;
