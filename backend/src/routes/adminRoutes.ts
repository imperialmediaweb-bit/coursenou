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
  getBlogs, getBlogById,
  getSettings,
  updateSettings,
  getUsage,
  getSecrets,
  updateSecret,
  testSecret,
  createBlog,
  updateBlog,
  deleteBlog,
  getMessages,
  replyToMessage,
  getContentPage,
  updateContentPage,
  getSiteConfig,
  updateSiteConfig,
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
// What the platform has spent on AI, and on whom.
router.get('/usage', getUsage);
router.get('/settings', getSettings);
// API keys and credentials, editable from the panel instead of the host.
router.get('/secrets', getSecrets);
router.put('/secrets', updateSecret);
router.post('/secrets/:group/test', testSecret);
router.put('/settings', updateSettings);
// Site name, search-engine description and the analytics snippet.
router.get('/site', getSiteConfig);
router.put('/site', updateSiteConfig);
router.get('/blogs', getBlogs);
router.get('/blogs/:id', getBlogById);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.get('/messages', getMessages);
router.post('/messages/:id/reply', replyToMessage);
router.get('/content/:slug', getContentPage);
router.put('/content/:slug', updateContentPage);
export default router;
