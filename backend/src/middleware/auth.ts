import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Demo user bypass — works without database
    if (decoded.userId === 'demo-user-id-001') {
      req.user = {
        _id: 'demo-user-id-001',
        id: 'demo-user-id-001',
        name: 'Demo User',
        email: 'demo@coursbit.com',
        role: 'user',
        plan: 'monthly',
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        aiProvider: process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : process.env.CLAUDE_API_KEY ? 'claude' : 'openai',
        aiCreditsUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      next();
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Auto-expire plan if planExpiresAt has passed
    if (user.plan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'free', planExpiresAt: null },
      });
      (user as any).plan = 'free';
      (user as any).planExpiresAt = null;
    }

    // Alias _id to id so all controllers work identically for real and demo users
    req.user = { ...user, _id: user.id } as any;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

/**
 * Attaches the user when a valid token is present, and simply carries on when
 * it is not.
 *
 * File downloads open in a new tab and so arrive with no Authorization header.
 * They authorise with a signed token in the query string instead, but a
 * same-session request should still be recognised — this lets the handler see
 * whichever of the two it gets, and decide for itself.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user) {
      req.user = { ...user, _id: user.id } as any;
    }
  } catch {
    // An unusable token is treated as no token; the handler decides.
  }

  next();
};

export const adminMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Always check role from DB, not from token
    const id = String(req.user._id || (req.user as any).id);
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user || user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const planMiddleware = (requiredPlan: 'monthly' | 'yearly') => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check plan from DB
      const id = String(req.user._id || (req.user as any).id);
      const user = await prisma.user.findUnique({ where: { id }, select: { plan: true, planExpiresAt: true } });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Auto-expire
      let currentPlan = user.plan;
      if (currentPlan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        await prisma.user.update({
          where: { id },
          data: { plan: 'free', planExpiresAt: null },
        });
        currentPlan = 'free';
      }

      const planHierarchy: Record<string, number> = { free: 0, monthly: 1, yearly: 2 };
      if (planHierarchy[currentPlan] < planHierarchy[requiredPlan]) {
        throw new AppError(
          `This feature requires a ${requiredPlan} plan. Please upgrade.`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
