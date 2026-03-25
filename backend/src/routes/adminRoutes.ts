import { Router } from 'express';
import {
  getStats,
  getUsers,
  getUserById,
  updateUserPlan,
  deleteUser,
  getCourses,
  deleteCourse,
  getInvoices,
  getBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getMessages,
  replyToMessage,
  getContentPage,
  updateContentPage,
} from '../controllers/adminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, adminMiddleware);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/plan', updateUserPlan);
router.delete('/users/:id', deleteUser);
router.get('/courses', getCourses);
router.delete('/courses/:id', deleteCourse);
router.get('/invoices', getInvoices);
router.get('/blogs', getBlogs);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.get('/messages', getMessages);
router.post('/messages/:id/reply', replyToMessage);
router.get('/content/:slug', getContentPage);
router.put('/content/:slug', updateContentPage);
export default router;
