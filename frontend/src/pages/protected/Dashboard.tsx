import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineAcademicCap,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePhotograph,
  HiOutlineVideoCamera,
  HiOutlineCollection,
} from 'react-icons/hi';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Course } from '../../types';

interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  certificatesEarned: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    completedCourses: 0,
    certificatesEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, certsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/certificates'),
      ]);
      const coursesList = coursesRes.data.data || coursesRes.data || [];
      setCourses(coursesList);
      setStats({
        totalCourses: coursesList.length,
        completedCourses: coursesList.filter((c: Course) => c.isCompleted).length,
        certificatesEarned: (certsRes.data?.length || certsRes.data?.data?.length || 0),
      });
    } catch {
      // Try just courses if certificates fails
      try {
        const coursesRes = await api.get('/courses');
        const coursesList = coursesRes.data.data || coursesRes.data || [];
        setCourses(coursesList);
        setStats({
          totalCourses: coursesList.length,
          completedCourses: coursesList.filter((c: Course) => c.isCompleted).length,
          certificatesEarned: 0,
        });
      } catch {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      const res = await api.get('/export/bulk', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'coursebit-courses-export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Courses exported!');
    } catch {
      toast.error('Failed to export courses');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      setDeletingId(courseId);
      await api.delete(`/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      setStats((prev) => ({
        ...prev,
        totalCourses: prev.totalCourses - 1,
      }));
      toast.success('Course deleted successfully');
    } catch {
      toast.error('Failed to delete course');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name || 'there'}!
            </h1>
            <p className="mt-1 text-gray-500">
              Here&apos;s an overview of your learning journey on CourseBit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {courses.length > 0 && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export All
              </button>
            )}
            <Link
              to="/bookmarks"
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              Bookmarks
            </Link>
          </div>
        </div>

        {/* Smart Recommendations */}
        {courses.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-primary-100 dark:border-primary-800">
            <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Suggested Next Courses
            </h3>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const topics = courses.map(c => c.title);
                const suggestions = [
                  `Advanced ${topics[0] || 'Programming'}`,
                  `${topics[topics.length - 1] || 'Data Science'} Best Practices`,
                  `${topics[0] || 'Web Dev'} in Practice`,
                ];
                return suggestions.map((s, i) => (
                  <Link
                    key={i}
                    to={`/create?title=${encodeURIComponent(s)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-sm text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <HiOutlinePlus className="w-3 h-3" />
                    {s}
                  </Link>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <HiOutlineBookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiOutlineCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <HiOutlineAcademicCap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.certificatesEarned}</p>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <HiOutlineCollection className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No courses yet</h3>
            <p className="mt-2 text-gray-500">
              Create your first AI course!
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <HiOutlinePlus className="h-5 w-5" />
              Create Course
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => navigate(`/course/${course._id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {course.title}
                    </h3>
                    <span
                      className={`ml-2 flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.type === 'video'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {course.type === 'video' ? (
                        <HiOutlineVideoCamera className="h-3 w-3" />
                      ) : (
                        <HiOutlinePhotograph className="h-3 w-3" />
                      )}
                      {course.type === 'video' ? 'Video' : 'Image'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {course.language} &middot; {course.topics.length} topic{course.topics.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        course.isCompleted ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      <HiOutlineCheckCircle className="h-4 w-4" />
                      {course.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(course._id);
                    }}
                    disabled={deletingId === course._id}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === course._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                    ) : (
                      <HiOutlineTrash className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <Link
        to="/create"
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center z-50"
        title="Create Course"
      >
        <HiOutlinePlus className="h-7 w-7" />
      </Link>
    </div>
  );
}
