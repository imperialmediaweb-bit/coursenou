import { Router } from 'express';
import { getCertificates, downloadCertificate } from '../controllers/certificateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/', authMiddleware, getCertificates);
// Public by unguessable cuid — certificates are shareable achievements,
// and window.open (used for the printable page) cannot send auth headers.
router.get('/:id/download', downloadCertificate);
export default router;
