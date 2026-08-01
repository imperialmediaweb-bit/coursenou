import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import prisma from './utils/prisma';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Startup validation: ensure JWT secrets exist. If not set, derive STABLE
// secrets from DATABASE_URL (unique per deployment, never in source, and —
// crucially — identical across restarts/redeploys so sessions survive).
// A purely random fallback would invalidate every user session on deploy.
const deriveSecret = (label: string): string =>
  crypto
    .createHash('sha256')
    .update(`${label}:${process.env.DATABASE_URL || 'coursbit-local'}`)
    .digest('hex');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = deriveSecret('jwt-access');
  console.warn('WARNING: JWT_SECRET not set — derived a stable secret from DATABASE_URL. Set JWT_SECRET explicitly for production.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = deriveSecret('jwt-refresh');
  console.warn('WARNING: JWT_REFRESH_SECRET not set — derived a stable secret from DATABASE_URL. Set JWT_REFRESH_SECRET explicitly for production.');
}

// Route imports
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import courseRoutes from './routes/courseRoutes';
import quizRoutes from './routes/quizRoutes';
import notesRoutes from './routes/notesRoutes';
import certificateRoutes from './routes/certificateRoutes';
import billingRoutes from './routes/billingRoutes';
import stripeRoutes from './routes/stripeRoutes';
import paypalRoutes from './routes/paypalRoutes';
import razorpayRoutes from './routes/razorpayRoutes';
import paystackRoutes from './routes/paystackRoutes';
import adminRoutes from './routes/adminRoutes';
import publicRoutes from './routes/publicRoutes';
import chatRoutes from './routes/chatRoutes';
import flashcardRoutes from './routes/flashcardRoutes';
import progressRoutes from './routes/progressRoutes';
import ratingRoutes from './routes/ratingRoutes';
import bookmarkRoutes from './routes/bookmarkRoutes';
import summaryRoutes from './routes/summaryRoutes';
import duplicateRoutes from './routes/duplicateRoutes';
import exportRoutes from './routes/exportRoutes';
import gamificationRoutes from './routes/gamificationRoutes';
import ogRoutes from './routes/ogRoutes';
import templateRoutes from './routes/templateRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();

// Railway (and most PaaS) sit behind a reverse proxy that sets
// X-Forwarded-For. Without this, express-rate-limit throws a
// ValidationError on every request in production.
app.set('trust proxy', 1);

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhook signatures are computed over the exact bytes the provider sent.
// Re-serialising a parsed object can change key order or escaping and make a
// legitimate event fail verification, so these routes must see the raw buffer
// and therefore must be registered before express.json().
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use('/api/paystack/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting — API only. Mounted globally it also counted the JS chunks,
// CSS and images of the app itself, so simply loading a page burned a tenth
// of the allowance and active users were served 429s.
app.use('/api', globalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version — lets us verify which build is actually live on Railway
const BUILD_TIME = new Date().toISOString();
app.get('/api/version', (_req, res) => {
  res.json({ buildStarted: BUILD_TIME, node: process.version });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/paystack', paystackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/duplicate', duplicateRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/og', ogRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve frontend static files in production.
// Hashed assets can be cached forever; index.html must never be cached,
// otherwise browsers keep loading stale JS bundles after a deploy.
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist, {
  index: false,
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// API 404 handler (only for /api routes)
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// SPA fallback — serve index.html for all non-API routes (never cached)
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Database connection and server start
const PORT = process.env.PORT || 3001;

// Start server, then connect to Postgres
app.listen(parseInt(PORT as string), '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
    // Seed demo account
    const bcrypt = require('bcryptjs');
    const existing = await prisma.user.findUnique({ where: { email: 'demo@coursbit.com' } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: 'Demo User',
          email: 'demo@coursbit.com',
          password: await bcrypt.hash('demo123456', 12),
          role: 'user',
          plan: 'monthly',
          planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          aiProvider: 'gemini',
        },
      });
      console.log('Demo account seeded: demo@coursbit.com / demo123456');
    }
  } catch (err: any) {
    console.error('DB connection issue:', err.message);
    console.log('Demo login still works without DB');
  }
});

export default app;
