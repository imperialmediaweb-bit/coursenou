import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

const isDemo = (req: AuthRequest): boolean =>
  String(req.user!._id || (req.user as any).id) === 'demo-user-id-001';

const userId = (req: AuthRequest): string => String(req.user!._id || (req.user as any).id);

export const listNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemo(req)) {
      res.json({ success: true, data: [], unread: 0 });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: userId(req) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: userId(req), read: false } }),
    ]);

    res.json({ success: true, data: notifications, unread });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemo(req)) {
      res.json({ success: true, unread: 0 });
      return;
    }
    const unread = await prisma.notification.count({
      where: { userId: userId(req), read: false },
    });
    res.json({ success: true, unread });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemo(req)) {
      res.json({ success: true });
      return;
    }

    // updateMany scoped by userId, so one account cannot flip another's rows.
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: userId(req) },
      data: { read: true },
    });

    if (result.count === 0) {
      throw new AppError('Notification not found', 404);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemo(req)) {
      res.json({ success: true, updated: 0 });
      return;
    }
    const result = await prisma.notification.updateMany({
      where: { userId: userId(req), read: false },
      data: { read: true },
    });
    res.json({ success: true, updated: result.count });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (isDemo(req)) {
      res.json({ success: true });
      return;
    }
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: userId(req) },
    });
    if (result.count === 0) {
      throw new AppError('Notification not found', 404);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
