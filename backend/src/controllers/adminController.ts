import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { emailService } from '../services/emailService';
import { getAiProvider, setAiProvider, configuredProviders, AI_PROVIDERS, AiProvider } from '../services/settingsService';

export const getStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalUsers, paidUsers, freeUsers, totalCourses] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: { not: 'free' } } }),
      prisma.user.count({ where: { plan: 'free' } }),
      prisma.course.count(),
    ]);

    // Total revenue from paid invoices
    const totalRevenueAgg = await prisma.invoice.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueAgg._sum.amount || 0;

    // MRR: revenue this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const mrrAgg = await prisma.invoice.aggregate({
      where: { status: 'paid', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const mrr = mrrAgg._sum.amount || 0;

    // Monthly revenue for the last 12 months
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const paidInvoices = await prisma.invoice.findMany({
      where: { status: 'paid', createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true, amount: true },
    });

    const revenueMap = new Map<string, number>();
    for (const inv of paidInvoices) {
      const d = new Date(inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueMap.set(key, (revenueMap.get(key) || 0) + inv.amount);
    }
    const monthlyRevenue = Array.from(revenueMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Monthly users for the last 12 months
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });

    const usersMap = new Map<string, number>();
    for (const u of recentUsers) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      usersMap.set(key, (usersMap.get(key) || 0) + 1);
    }
    const monthlyUsers = Array.from(usersMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      totalUsers,
      paidUsers,
      freeUsers,
      totalCourses,
      totalRevenue,
      mrr,
      monthlyRevenue,
      monthlyUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, plan: true,
          planExpiresAt: true, aiProvider: true, aiCreditsUsed: true,
          createdAt: true, updatedAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      // `data` is the field the shared PaginatedResponse type declares and the
      // admin screens read; `users` is kept for any older consumer.
      data: users,
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        planExpiresAt: true, aiProvider: true, aiCreditsUsed: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!['free', 'monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be free, monthly, or yearly', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    let planExpiresAt: Date | null = null;
    if (plan !== 'free') {
      const expiresAt = new Date();
      if (plan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      planExpiresAt = expiresAt;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { plan, planExpiresAt },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        planExpiresAt: true, aiProvider: true, aiCreditsUsed: true,
        createdAt: true, updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const userId = existingUser.id;
    await Promise.all([
      prisma.course.deleteMany({ where: { userId } }),
      prisma.quiz.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.certificate.deleteMany({ where: { userId } }),
      prisma.invoice.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
    ]);
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCourses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count(),
    ]);

    res.json({
      // `data` is the field the shared PaginatedResponse type declares and the
      // admin screens read; `courses` is kept for any older consumer.
      data: courses,
      courses,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const courseId = course.id;
    await Promise.all([
      prisma.quiz.deleteMany({ where: { courseId } }),
      prisma.note.deleteMany({ where: { courseId } }),
    ]);
    await prisma.course.delete({ where: { id: courseId } });

    res.json({ message: 'Course and associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count(),
    ]);

    res.json({
      // `data` is the field the shared PaginatedResponse type declares and the
      // admin screens read; `invoices` is kept for any older consumer.
      data: invoices,
      invoices,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getBlogs = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blogs = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(blogs);
  } catch (error) {
    next(error);
  }
};

/**
 * A single blog post for the admin editor. The edit screen has always
 * requested this; without the route it 404'd and the form opened empty.
 */
export const getBlogById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id } });
    if (!blog) {
      throw new AppError('Blog post not found', 404);
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
};


/** URL-safe slug, guaranteed not to collide with an existing post. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const uniqueBlogSlug = async (source: string, ignoreId?: string): Promise<string> => {
  const base = slugify(source) || 'post';
  let candidate = base;

  for (let suffix = 2; suffix < 200; suffix++) {
    const existing = await prisma.blog.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
};

export const createBlog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, content, published, coverImage, slug: requestedSlug } = req.body;

    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    // The editor sends a slug but it used to be ignored and always derived
    // from the title — so two posts with the same title collided on the unique
    // index and the admin saw a bare 500.
    const slug = await uniqueBlogSlug(requestedSlug || title);

    const blog = await prisma.blog.create({
      data: {
        title,
        slug,
        content,
        published: published || false,
        coverImage: coverImage || null,
      },
    });

    res.status(201).json(blog);
  } catch (error) {
    next(error);
  }
};

export const updateBlog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await prisma.blog.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError('Blog not found', 404);
    }

    const { title, content, published, coverImage, slug: requestedSlug } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (title !== undefined || requestedSlug !== undefined) {
      // Renaming a post to an existing title used to violate the unique index
      // and surface as a 500 in the editor.
      data.slug = await uniqueBlogSlug(requestedSlug || title, existing.id);
    }
    if (content !== undefined) data.content = content;
    if (published !== undefined) data.published = published;
    if (coverImage !== undefined) data.coverImage = coverImage;

    const blog = await prisma.blog.update({
      where: { id: req.params.id },
      data,
    });
    res.json(blog);
  } catch (error) {
    next(error);
  }
};

export const deleteBlog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id } });
    if (!blog) {
      throw new AppError('Blog not found', 404);
    }

    await prisma.blog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

export const replyToMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError('Message not found', 404);
    }

    const { replyText } = req.body;
    if (!replyText) {
      throw new AppError('Reply text is required', 400);
    }

    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { replied: true, replyText },
    });

    await emailService.sendContactReply(
      message.email,
      message.name,
      message.message,
      replyText
    );

    res.json(message);
  } catch (error) {
    next(error);
  }
};

export const getContentPage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await prisma.contentPage.findFirst({ where: { slug: req.params.slug } });
    res.json(page);
  } catch (error) {
    next(error);
  }
};

export const updateContentPage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content } = req.body;
    const page = await prisma.contentPage.upsert({
      where: { slug: req.params.slug },
      create: { slug: req.params.slug, content },
      update: { content },
    });
    res.json(page);
  } catch (error) {
    next(error);
  }
};

/** Platform settings the owner controls (currently the AI provider). */
export const getSettings = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({
      aiProvider: await getAiProvider(),
      providers: AI_PROVIDERS,
      configured: configuredProviders(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { aiProvider } = req.body;
    if (!AI_PROVIDERS.some((p) => p.value === aiProvider)) {
      throw new AppError('Invalid AI provider', 400);
    }
    if (!configuredProviders()[aiProvider as AiProvider]) {
      throw new AppError(
        `No API key is configured for ${aiProvider}. Add it in the environment first.`,
        400
      );
    }

    await setAiProvider(aiProvider);
    res.json({ aiProvider, providers: AI_PROVIDERS, configured: configuredProviders() });
  } catch (error) {
    next(error);
  }
};
