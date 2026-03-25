import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Public pages
const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/public/Home'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/public/ResetPassword'));
const BlogList = lazy(() => import('./pages/public/BlogList'));
const BlogPost = lazy(() => import('./pages/public/BlogPost'));
const ContentPage = lazy(() => import('./pages/public/ContentPage'));
const Contact = lazy(() => import('./pages/public/Contact'));
const SharedCourse = lazy(() => import('./pages/public/SharedCourse'));
const Pricing = lazy(() => import('./pages/public/Pricing'));

// Protected pages
const Dashboard = lazy(() => import('./pages/protected/Dashboard'));
const CreateCourse = lazy(() => import('./pages/protected/CreateCourse'));
const CourseView = lazy(() => import('./pages/protected/CourseView'));
const Quiz = lazy(() => import('./pages/protected/QuizPage'));
const Certificate = lazy(() => import('./pages/protected/CertificatePage'));
const Billing = lazy(() => import('./pages/protected/BillingPage'));
const Settings = lazy(() => import('./pages/protected/Settings'));
const Notifications = lazy(() => import('./pages/protected/Notifications'));
const FlashcardsPage = lazy(() => import('./pages/protected/FlashcardsPage'));
const BookmarksPage = lazy(() => import('./pages/protected/BookmarksPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AdminBlogNew = lazy(() => import('./pages/admin/AdminBlogEditor'));
const AdminBlogEdit = lazy(() => import('./pages/admin/AdminBlogEditor'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
  </div>
);

const App = () => {
  const { fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, []);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Landing page - no layout wrapper, has its own navbar/footer */}
        <Route path="/" element={<Landing />} />
        {/* Auth pages - standalone dark design, no layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/terms" element={<ContentPage />} />
          <Route path="/privacy" element={<ContentPage />} />
          <Route path="/cancellation" element={<ContentPage />} />
          <Route path="/refund" element={<ContentPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/card/:shareToken" element={<SharedCourse />} />
          <Route path="/share/:shareToken" element={<SharedCourse />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateCourse />} />
            <Route path="/course/:id" element={<CourseView />} />
            <Route path="/course/:id/quiz" element={<Quiz />} />
            <Route path="/certificate/:id" element={<Certificate />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/course/:id/flashcards" element={<FlashcardsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/blogs" element={<AdminBlogs />} />
            <Route path="/admin/blogs/new" element={<AdminBlogNew />} />
            <Route path="/admin/blogs/:id/edit" element={<AdminBlogEdit />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
