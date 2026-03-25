import { useState, useEffect } from 'react';
import { HiDocumentText, HiArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CONTENT_PAGES = [
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'cancellation', label: 'Cancellation Policy' },
  { slug: 'refund', label: 'Refund Policy' },
  { slug: 'billing', label: 'Billing Policy' },
];

const AdminContent = () => {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedSlug) {
      fetchContent(selectedSlug);
    }
  }, [selectedSlug]);

  const fetchContent = async (slug: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/content/${slug}`);
      setContent(res.data.content || '');
    } catch {
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      await api.put(`/admin/content/${selectedSlug}`, { content });
      toast.success('Content saved');
    } catch {
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (selectedSlug) {
    const pageLabel = CONTENT_PAGES.find((p) => p.slug === selectedSlug)?.label || selectedSlug;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSlug(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{pageLabel}</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (HTML)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={24}
                  placeholder="Enter HTML content..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Content'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Pages</h1>
        <p className="text-gray-500 mt-1">Manage site content and legal pages</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {CONTENT_PAGES.map((page) => (
            <button
              key={page.slug}
              onClick={() => setSelectedSlug(page.slug)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <HiDocumentText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{page.label}</h3>
                  <p className="text-xs text-gray-500">/{page.slug}</p>
                </div>
              </div>
              <span className="text-sm text-indigo-600 font-medium">Edit</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminContent;
