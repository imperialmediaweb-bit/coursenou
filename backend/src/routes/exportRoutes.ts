import { Router } from 'express';
import { bulkExport, exportAdminCSV } from '../controllers/exportController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
router.get('/bulk', authMiddleware, bulkExport);
router.get('/admin/csv', authMiddleware, adminMiddleware, exportAdminCSV);
export default router;
