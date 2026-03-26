import { Router } from 'express';
import {
  generateTopics,
  generateCourse,
  getCourses,
  getCourseById,
  deleteCourse,
  completeCourse,
  getSharedCourse,
  generateAudio,
  exportPDF,
  exportPPT,
} from '../controllers/courseController';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/generate-topics', authMiddleware, aiLimiter, generateTopics);
router.post('/generate', authMiddleware, aiLimiter, generateCourse);
router.get('/', authMiddleware, getCourses);
router.get('/share/:token', getSharedCourse);
router.get('/:id', authMiddleware, getCourseById);
router.delete('/:id', authMiddleware, deleteCourse);
router.post('/:id/complete', authMiddleware, completeCourse);
router.post('/:id/generate-audio', authMiddleware, generateAudio);
router.get('/:id/export/pdf', exportPDF);
router.get('/:id/export/ppt', authMiddleware, exportPPT);
export default router;
