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
      // The API answers { success, data }; assigning res.data stored the
      // envelope, and filtering it as an array crashed the page.
      setBookmarks(res.data?.data ?? res.data ?? []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Bookmarks</h1>
            <p className="text-sm text-muted mt-1">
              {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>

        {/* Search */}
        {bookmarks.length > 0 && (
          <div className="relative mb-6">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <input
              type="text"
              placeholder="Search bookmarks by title, note, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
            />
          </div>
        )}

        {/* Empty State */}
        {bookmarks.length === 0 && (
          <div className="bg-surface rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <HiOutlineBookmark className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Bookmarks Yet</h2>
            <p className="text-muted max-w-md mx-auto">
              Bookmark subtopics while studying! You can save important sections to review later.
            </p>
          </div>
        )}

        {/* No search results */}
        {bookmarks.length > 0 && filteredBookmarks.length === 0 && (
          <div className="bg-surface rounded-xl shadow-sm border border-border p-8 text-center">
            <HiOutlineSearch className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">No bookmarks match your search.</p>
          </div>
        )}

        {/* Grouped Bookmarks */}
        <div className="space-y-6">
          {groupedBookmarks.map((group) => (
            <div
              key={group.courseId}
              className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden"
            >
              {/* Course Header */}
              <div className="px-6 py-4 bg-base border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <HiOutlineBookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{group.courseTitle}</h3>
                    <p className="text-xs text-muted">
                      {group.bookmarks.length} bookmark{group.bookmarks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/course/${group.courseId}`}
                  className="text-sm text-accent hover:text-accent-glow font-medium transition-colors"
                >
                  View Course
                </Link>
              </div>

              {/* Bookmark Items */}
              <div className="divide-y divide-gray-100">
                {group.bookmarks.map((bookmark) => (
                  <div
                    key={bookmark._id}
                    className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-base transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <HiOutlineBookmark className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <h4 className="font-medium text-white truncate">
                          {bookmark.subtopicTitle}
                        </h4>
                      </div>
                      {bookmark.note && (
                        <p className="text-sm text-muted ml-6 line-clamp-2">{bookmark.note}</p>
                      )}
                      <p className="text-xs text-muted ml-6 mt-1">
                        Topic {bookmark.topicIndex + 1}, Subtopic {bookmark.subtopicIndex + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        to={`/course/${group.courseId}?topic=${bookmark.topicIndex}&subtopic=${bookmark.subtopicIndex}`}
                        className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        title="Go to subtopic"
                      >
                        <HiOutlineExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(bookmark._id)}
                        disabled={deletingId === bookmark._id}
                        className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
