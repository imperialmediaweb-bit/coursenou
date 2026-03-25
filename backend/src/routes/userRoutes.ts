import { Router } from 'express';
import { getProfile, updateProfile, changePassword, switchAiProvider, deleteAccount } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/ai-provider', switchAiProvider);
router.delete('/account', deleteAccount);
export default router;
