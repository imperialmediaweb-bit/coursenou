export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'monthly' | 'yearly';
  planExpiresAt: string | null;
  aiProvider: 'gemini' | 'openai';
  aiCreditsUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtopic {
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface Topic {
  title: string;
  subtopics: Subtopic[];
}

export interface Course {
  _id: string;
  userId: string;
  title: string;
  language: string;
  type: 'image' | 'video';
  topics: Topic[];
  audioUrl: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicSuggestion {
  title: string;
  subtopics: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  _id: string;
  userId: string;
  courseId: string;
  language: string;
  questions: QuizQuestion[];
  score: number | null;
  passed: boolean;
  completedAt: string | null;
}

export interface Note {
  _id?: string;
  userId?: string;
  courseId?: string;
  content: string;
  updatedAt?: string;
}

export interface Certificate {
  _id: string;
  userId: string;
  courseId: string | { _id: string; title: string };
  courseName: string;
  userName: string;
  issuedAt: string;
  downloadUrl: string;
}

export interface Invoice {
  _id: string;
  userId: string | { _id: string; name: string; email: string };
  amount: number;
  currency: string;
  plan: 'monthly' | 'yearly';
  provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack';
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  receiptUrl: string | null;
  createdAt: string;
}

export interface Subscription {
  _id: string;
  userId: string;
  provider: string;
  planType: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: string;
  endDate: string;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  coverImage: string | null;
  published: boolean;
  createdAt: string;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  replied: boolean;
  replyText: string | null;
  createdAt: string;
}

export interface ContentPage {
  _id: string;
  slug: string;
  content: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  totalCourses: number;
  totalRevenue: number;
  mrr: number;
  monthlyRevenue: { month: string; amount: number }[];
  monthlyUsers: { month: string; count: number }[];
}

export interface PlanInfo {
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface FlashcardItem {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed: string | null;
  nextReview: string | null;
  correctCount: number;
  incorrectCount: number;
}

export interface Flashcard {
  _id: string;
  userId: string;
  courseId: string;
  cards: FlashcardItem[];
  createdAt: string;
}

export interface CourseProgress {
  _id?: string;
  userId?: string;
  courseId?: string;
  visitedSubtopics: string[];
  percentage: number;
  lastVisitedTopic: number;
  lastVisitedSubtopic: number;
  totalTimeSpent: number;
}

export interface Rating {
  _id: string;
  userId: string;
  courseId: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export interface CourseRatingInfo {
  userRating: Rating | null;
  averageRating: number;
  totalRatings: number;
}

export interface Bookmark {
  _id: string;
  userId: string;
  courseId: string | { _id: string; title: string };
  topicIndex: number;
  subtopicIndex: number;
  subtopicTitle: string;
  note: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
