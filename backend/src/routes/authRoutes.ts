import { Router } from 'express';
import { register, login, logout, refresh, forgotPassword, resetPassword, me } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authMiddleware, logout);
router.post('/refresh', refresh);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', authMiddleware, me);
export default router;
