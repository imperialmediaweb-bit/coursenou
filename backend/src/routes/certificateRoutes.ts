import { Router } from 'express';
import { getCertificates, downloadCertificate } from '../controllers/certificateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/', getCertificates);
router.get('/:id/download', downloadCertificate);
export default router;
