import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: IUser;
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
    const jwtSecret = process.env.JWT_SECRET || 'demo-jwt-secret-key-minimum-64-chars-for-security-purposes-here';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    // Demo user bypass — works without database
    if (decoded.userId === 'demo-user-id-001') {
      req.user = {
        _id: 'demo-user-id-001',
        name: 'Demo User',
        email: 'demo@coursbit.com',
        role: 'user',
        plan: 'monthly',
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        aiProvider: 'gemini',
        aiCreditsUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      next();
      return;
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Auto-expire plan if planExpiresAt has passed
    if (user.plan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
      user.plan = 'free';
      user.planExpiresAt = null;
      await user.save();
    }

    req.user = user;
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
    const user = await User.findById(req.user._id).select('role');
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
      const user = await User.findById(req.user._id).select('plan planExpiresAt');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Auto-expire
      if (user.plan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        user.plan = 'free';
        user.planExpiresAt = null;
        await user.save();
      }

      const planHierarchy = { free: 0, monthly: 1, yearly: 2 };
      if (planHierarchy[user.plan] < planHierarchy[requiredPlan]) {
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
