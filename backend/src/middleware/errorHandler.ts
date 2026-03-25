import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Log unexpected errors but don't expose details in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unexpected error:', err);
  } else {
    console.error('Unexpected error:', err.message);
  }

  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
  });
};
