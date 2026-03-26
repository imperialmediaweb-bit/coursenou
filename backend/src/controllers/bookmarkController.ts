import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Bookmark from '../models/Bookmark';

// In-memory bookmark store for demo users
const demoBookmarks: any[] = [];

const isDemoReq = (req: AuthRequest) =>
  String(req.user!._id) === 'demo-user-id-001';

export const addBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, topicIndex, subtopicIndex, subtopicTitle, note } = req.body;
    if (!courseId || typeof topicIndex !== 'number' || typeof subtopicIndex !== 'number' || !subtopicTitle) {
      throw new AppError('Missing required fields', 400);
    }

    if (isDemoReq(req)) {
      const bookmark = { _id: `demo-bm-${Date.now()}`, userId: req.user!._id, courseId, topicIndex, subtopicIndex, subtopicTitle, note: note || '', createdAt: new Date() };
      demoBookmarks.push(bookmark);
      res.status(201).json({ success: true, data: bookmark });
      return;
    }

    const bookmark = await Bookmark.create({
      userId: req.user!._id, courseId, topicIndex, subtopicIndex, subtopicTitle, note: note || '',
    });
    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
};

export const getBookmarks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemoReq(req)) {
      const bookmarks = demoBookmarks.filter(b => b.courseId === req.params.courseId);
      res.status(200).json({ success: true, data: bookmarks });
      return;
    }
    const bookmarks = await Bookmark.find({ userId: req.user!._id, courseId: req.params.courseId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookmarks });
  } catch (error) {
    next(error);
  }
};

export const getUserBookmarks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemoReq(req)) {
      res.status(200).json({ success: true, data: demoBookmarks });
      return;
    }
    const bookmarks = await Bookmark.find({ userId: req.user!._id }).populate('courseId', 'title').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookmarks });
  } catch (error) {
    next(error);
  }
};

export const removeBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemoReq(req)) {
      const idx = demoBookmarks.findIndex(b => b._id === req.params.id);
      if (idx !== -1) demoBookmarks.splice(idx, 1);
      res.status(200).json({ success: true, message: 'Bookmark removed' });
      return;
    }
    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) throw new AppError('Bookmark not found', 404);
    if (bookmark.userId.toString() !== req.user!._id.toString()) throw new AppError('Not authorized', 403);
    await Bookmark.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    next(error);
  }
};
