import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Note from '../models/Note';

export const getNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { content: '' } });
      return;
    }

    const note = await Note.findOne({
      courseId: req.params.courseId,
      userId: req.user!._id,
    });

    res.status(200).json({ success: true, data: note || { content: '' } });
  } catch (error) {
    next(error);
  }
};

export const saveNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { content: req.body.content || '' } });
      return;
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
      throw new AppError('Content must be a string', 400);
    }

    const note = await Note.findOneAndUpdate(
      { userId: req.user!._id, courseId: req.params.courseId },
      { userId: req.user!._id, courseId: req.params.courseId, content },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};
