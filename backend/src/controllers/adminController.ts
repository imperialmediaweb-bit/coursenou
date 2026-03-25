import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import Course from '../models/Course';
import Quiz from '../models/Quiz';
import Note from '../models/Note';
import Certificate from '../models/Certificate';
import Invoice from '../models/Invoice';
import Subscription from '../models/Subscription';
import Blog from '../models/Blog';
import ContactMessage from '../models/ContactMessage';
import ContentPage from '../models/ContentPage';
import { emailService } from '../services/emailService';

export const getStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalUsers, paidUsers, freeUsers, totalCourses] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: { $ne: 'free' } }),
      User.countDocuments({ plan: 'free' }),
      Course.countDocuments(),
    ]);

    const totalRevenueAgg = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const mrrAgg = await Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const mrr = mrrAgg[0]?.total || 0;

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyRevenue = await Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          amount: 1,
        },
      },
    ]);

    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]);

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

    const filter: any = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({
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
    const user = await User.findById(req.params.id).select('-password');
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

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.plan = plan;
    if (plan === 'free') {
      user.planExpiresAt = null;
    } else {
      const expiresAt = new Date();
      if (plan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      user.planExpiresAt = expiresAt;
    }

    await user.save();
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
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userId = user._id;
    await Promise.all([
      Course.deleteMany({ userId }),
      Quiz.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      Certificate.deleteMany({ userId }),
      Invoice.deleteMany({ userId }),
      Subscription.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

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
      Course.find()
        .populate('userId', 'name email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Course.countDocuments(),
    ]);

    res.json({
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
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const courseId = course._id;
    await Promise.all([
      Quiz.deleteMany({ courseId }),
      Note.deleteMany({ courseId }),
      Course.findByIdAndDelete(courseId),
    ]);

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
      Invoice.find()
        .populate('userId', 'name email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Invoice.countDocuments(),
    ]);

    res.json({
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
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    next(error);
  }
};

export const createBlog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, content, published, coverImage } = req.body;

    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    const slug = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const blog = await Blog.create({
      title,
      slug,
      content,
      published: published || false,
      coverImage: coverImage || null,
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
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      throw new AppError('Blog not found', 404);
    }

    const { title, content, published, coverImage } = req.body;

    if (title !== undefined) {
      blog.title = title;
      blog.slug = title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    if (content !== undefined) blog.content = content;
    if (published !== undefined) blog.published = published;
    if (coverImage !== undefined) blog.coverImage = coverImage;

    await blog.save();
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
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      throw new AppError('Blog not found', 404);
    }

    await Blog.findByIdAndDelete(req.params.id);
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
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
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
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const { replyText } = req.body;
    if (!replyText) {
      throw new AppError('Reply text is required', 400);
    }

    message.replied = true;
    message.replyText = replyText;
    await message.save();

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
    const page = await ContentPage.findOne({ slug: req.params.slug });
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
    const page = await ContentPage.findOneAndUpdate(
      { slug: req.params.slug },
      { content },
      { new: true, upsert: true }
    );
    res.json(page);
  } catch (error) {
    next(error);
  }
};
