import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Bookmark from '../models/Bookmark';

export const addBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { courseId, topicIndex, subtopicIndex, subtopicTitle, note } = req.body;

    if (!courseId) {
      throw new AppError('courseId is required', 400);
    }

    if (typeof topicIndex !== 'number' || typeof subtopicIndex !== 'number') {
      throw new AppError('topicIndex and subtopicIndex must be numbers', 400);
    }

    if (!subtopicTitle || typeof subtopicTitle !== 'string') {
      throw new AppError('subtopicTitle is required and must be a string', 400);
    }

    if (note !== undefined && typeof note !== 'string') {
      throw new AppError('note must be a string', 400);
    }

    const bookmark = await Bookmark.create({
      userId: user._id,
      courseId,
      topicIndex,
      subtopicIndex,
      subtopicTitle,
      note: note || '',
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
    const user = req.user!;

    const bookmarks = await Bookmark.find({
      userId: user._id,
      courseId: req.params.courseId,
    }).sort({ createdAt: -1 });

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
    const user = req.user!;

    const bookmarks = await Bookmark.find({ userId: user._id })
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

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
    const user = req.user!;

    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) {
      throw new AppError('Bookmark not found', 404);
    }

    if (bookmark.userId.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to delete this bookmark', 403);
    }

    await Bookmark.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Bookmark removed successfully' });
  } catch (error) {
    next(error);
  }
};
