import { Router } from 'express';
import {
  generateTopics,
  generateCourse,
  getCourses,
  getCourseById,
  deleteCourse,
  completeCourse,
  resetShareLink,
  getSharedCourse,
  generateAudio,
  exportPDF,
  exportPPT,
  getDownloadToken,
} from '../controllers/courseController';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/generate-topics', authMiddleware, aiLimiter, generateTopics);
router.post('/generate', authMiddleware, aiLimiter, generateCourse);
router.get('/', authMiddleware, getCourses);
router.get('/share/:shareToken', getSharedCourse);
router.get('/:id', authMiddleware, getCourseById);
router.delete('/:id', authMiddleware, deleteCourse);
router.post('/:id/complete', authMiddleware, completeCourse);
// Retires the current share link and issues a new one, so a link sent to the
// wrong person can be taken back.
router.post('/:id/reset-share', authMiddleware, resetShareLink);
router.post('/:id/generate-audio', authMiddleware, generateAudio);
router.get('/:id/download-token', authMiddleware, getDownloadToken);
// These are opened in a new tab, which cannot send an Authorization header, so
// they authorise with the signed token issued above. optionalAuth still lets a
// same-session request through without one.
router.get('/:id/export/pdf', optionalAuth, exportPDF);
router.get('/:id/export/ppt', optionalAuth, exportPPT);
export default router;
