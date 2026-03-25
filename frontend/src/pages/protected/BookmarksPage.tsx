import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineBookmark,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineExternalLink,
  HiOutlineBookOpen,
} from 'react-icons/hi';
import api from '../../services/api';
import { Bookmark } from '../../types';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookmarks');
      setBookmarks(res.data);
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this bookmark?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/bookmarks/${id}`);
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
      toast.success('Bookmark deleted');
    } catch {
      toast.error('Failed to delete bookmark');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBookmarks = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const query = search.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.subtopicTitle.toLowerCase().includes(query) ||
        b.note?.toLowerCase().includes(query) ||
        (typeof b.courseId === 'object' && b.courseId.title.toLowerCase().includes(query))
    );
  }, [bookmarks, search]);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, { courseTitle: string; courseId: string; bookmarks: Bookmark[] }> =
      {};
    for (const bookmark of filteredBookmarks) {
      const courseKey =
        typeof bookmark.courseId === 'object' ? bookmark.courseId._id : bookmark.courseId;
      const courseTitle =
        typeof bookmark.courseId === 'object' ? bookmark.courseId.title : 'Unknown Course';
      if (!groups[courseKey]) {
        groups[courseKey] = { courseTitle, courseId: courseKey, bookmarks: [] };
      }
      groups[courseKey].bookmarks.push(bookmark);
    }
    return Object.values(groups);
  }, [filteredBookmarks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>

        {/* Search */}
        {bookmarks.length > 0 && (
          <div className="relative mb-6">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookmarks by title, note, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Empty State */}
        {bookmarks.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
              <HiOutlineBookmark className="h-10 w-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Bookmarks Yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Bookmark subtopics while studying! You can save important sections to review later.
            </p>
          </div>
        )}

        {/* No search results */}
        {bookmarks.length > 0 && filteredBookmarks.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <HiOutlineSearch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookmarks match your search.</p>
          </div>
        )}

        {/* Grouped Bookmarks */}
        <div className="space-y-6">
          {groupedBookmarks.map((group) => (
            <div
              key={group.courseId}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Course Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <HiOutlineBookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.courseTitle}</h3>
                    <p className="text-xs text-gray-500">
                      {group.bookmarks.length} bookmark{group.bookmarks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/course/${group.courseId}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  View Course
                </Link>
              </div>

              {/* Bookmark Items */}
              <div className="divide-y divide-gray-100">
                {group.bookmarks.map((bookmark) => (
                  <div
                    key={bookmark._id}
                    className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <HiOutlineBookmark className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900 truncate">
                          {bookmark.subtopicTitle}
                        </h4>
                      </div>
                      {bookmark.note && (
                        <p className="text-sm text-gray-500 ml-6 line-clamp-2">{bookmark.note}</p>
                      )}
                      <p className="text-xs text-gray-400 ml-6 mt-1">
                        Topic {bookmark.topicIndex + 1}, Subtopic {bookmark.subtopicIndex + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        to={`/course/${group.courseId}?topic=${bookmark.topicIndex}&subtopic=${bookmark.subtopicIndex}`}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Go to subtopic"
                      >
                        <HiOutlineExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(bookmark._id)}
                        disabled={deletingId === bookmark._id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete bookmark"
                      >
                        {deletingId === bookmark._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <HiOutlineTrash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
