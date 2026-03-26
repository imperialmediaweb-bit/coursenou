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
import XPBar from '../../components/ui/XPBar';
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

      let coursesList: Course[] = [];
      let certificatesCount = 0;

      try {
        const coursesRes = await api.get('/courses');
        coursesList = coursesRes.data?.data || coursesRes.data || [];
      } catch {
        coursesList = [];
      }

      try {
        const certsRes = await api.get('/certificates');
        certificatesCount = certsRes.data?.data?.length || certsRes.data?.length || 0;
      } catch {
        certificatesCount = 0;
      }

      setCourses(coursesList);
      setStats({
        totalCourses: coursesList.length,
        completedCourses: coursesList.filter((c: Course) => c.isCompleted).length,
        certificatesEarned: certificatesCount,
      });
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080C' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent" style={{ borderTopColor: '#6C47FF', borderRightColor: '#6C47FF' }} />
          <p className="font-sans text-sm" style={{ color: '#A8A8C0' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const statsConfig = [
    {
      label: 'Total Courses',
      value: stats.totalCourses,
      icon: HiOutlineBookOpen,
      gradient: 'linear-gradient(135deg, rgba(108,71,255,0.12) 0%, rgba(108,71,255,0.04) 100%)',
    },
    {
      label: 'Completed',
      value: stats.completedCourses,
      icon: HiOutlineCheckCircle,
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
    },
    {
      label: 'Certificates',
      value: stats.certificatesEarned,
      icon: HiOutlineAcademicCap,
      gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.04) 100%)',
    },
  ];

  return (
    <div className="min-h-screen font-sans py-8 px-4 sm:px-6 lg:px-8" style={{ background: '#08080C' }}>
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold font-sans" style={{ color: '#F0F0FF' }}>
              Welcome back, {user?.name || 'there'}!
            </h1>
            <p className="mt-1 font-sans text-sm" style={{ color: '#A8A8C0' }}>
              Here&apos;s an overview of your learning journey.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {courses.length > 0 && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-sans font-medium rounded-xl transition-all duration-200 hover:brightness-125"
                style={{
                  background: '#0F0F15',
                  border: '1px solid #1C1C28',
                  color: '#A8A8C0',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            )}
            <Link
              to="/bookmarks"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-sans font-medium rounded-xl transition-all duration-200 hover:brightness-125"
              style={{
                background: '#0F0F15',
                border: '1px solid #1C1C28',
                color: '#A8A8C0',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmarks
            </Link>
          </div>
        </div>

        {/* Smart Recommendations */}
        {courses.length > 0 && (
          <div
            className="mb-8 rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(108,71,255,0.15) 0%, rgba(108,71,255,0.05) 100%)',
              border: '1px solid rgba(108,71,255,0.2)',
            }}
          >
            <h3 className="text-sm font-semibold font-sans mb-3 flex items-center gap-2" style={{ color: '#6C47FF' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-sans font-medium transition-all duration-200 hover:brightness-125"
                    style={{
                      background: '#0F0F15',
                      border: '1px solid #1C1C28',
                      color: '#F0F0FF',
                    }}
                  >
                    <HiOutlinePlus className="w-3.5 h-3.5" style={{ color: '#6C47FF' }} />
                    {s}
                  </Link>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsConfig.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 hover:brightness-110"
              style={{
                background: '#0F0F15',
                border: '1px solid #1C1C28',
              }}
            >
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: stat.gradient }}
              >
                <stat.icon className="h-6 w-6" style={{ color: '#6C47FF' }} />
              </div>
              <div>
                <p className="text-sm font-medium font-sans" style={{ color: '#3D3D52' }}>{stat.label}</p>
                <p className="text-2xl font-bold font-sans" style={{ color: '#F0F0FF' }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* XP Progress */}
        <div className="mb-8">
          <XPBar />
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: '#0F0F15',
              border: '1px solid #1C1C28',
            }}
          >
            <HiOutlineCollection className="mx-auto h-16 w-16" style={{ color: '#3D3D52' }} />
            <h3 className="mt-4 text-lg font-semibold font-sans" style={{ color: '#F0F0FF' }}>
              No courses yet
            </h3>
            <p className="mt-2 font-sans text-sm" style={{ color: '#A8A8C0' }}>
              Create your first AI-powered course and start learning today.
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-sans font-medium text-white transition-all duration-200 hover:brightness-110"
              style={{ background: '#6C47FF' }}
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
                className="rounded-2xl overflow-hidden transition-all duration-200 hover:brightness-110"
                style={{
                  background: '#0F0F15',
                  border: '1px solid #1C1C28',
                }}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => navigate(`/course/${course._id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold font-sans line-clamp-2 flex-1" style={{ color: '#F0F0FF' }}>
                      {course.title}
                    </h3>
                    <span
                      className="ml-2 flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans font-medium"
                      style={{
                        background: course.type === 'video' ? 'rgba(168,85,247,0.15)' : 'rgba(108,71,255,0.15)',
                        color: course.type === 'video' ? '#a855f7' : '#6C47FF',
                      }}
                    >
                      {course.type === 'video' ? (
                        <HiOutlineVideoCamera className="h-3 w-3" />
                      ) : (
                        <HiOutlinePhotograph className="h-3 w-3" />
                      )}
                      {course.type === 'video' ? 'Video' : 'Image'}
                    </span>
                  </div>
                  <p className="text-sm font-sans mb-3" style={{ color: '#A8A8C0' }}>
                    {course.language} &middot; {course.topics.length} topic{course.topics.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-sans font-medium"
                      style={{ color: course.isCompleted ? '#22c55e' : '#eab308' }}
                    >
                      <HiOutlineCheckCircle className="h-4 w-4" />
                      {course.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                    <span className="text-xs font-sans" style={{ color: '#3D3D52' }}>
                      {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div
                  className="px-6 py-3 flex justify-end"
                  style={{ borderTop: '1px solid #1C1C28' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(course._id);
                    }}
                    disabled={deletingId === course._id}
                    className="inline-flex items-center gap-1 text-sm font-sans transition-all duration-200 hover:brightness-125 disabled:opacity-50"
                    style={{ color: '#ef4444' }}
                  >
                    {deletingId === course._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent" style={{ borderTopColor: '#ef4444' }} />
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
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg transition-all duration-200 hover:brightness-110 hover:scale-105 flex items-center justify-center z-50 text-white"
        style={{
          background: '#6C47FF',
          boxShadow: '0 8px 32px rgba(108,71,255,0.4)',
        }}
        title="Create Course"
      >
        <HiOutlinePlus className="h-7 w-7" />
      </Link>
    </div>
  );
}
