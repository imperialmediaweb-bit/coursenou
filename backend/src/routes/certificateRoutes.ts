import { Router } from 'express';
import { getCertificates, getCertificateById, downloadCertificate } from '../controllers/certificateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/', authMiddleware, getCertificates);
// Public by unguessable cuid — certificates are shareable achievements,
// and window.open (used for the printable page) cannot send auth headers.
router.get('/:id/download', downloadCertificate);
router.get('/:id', getCertificateById);
export default router;
