import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { ContentPage as ContentPageType } from '../../types';
import toast from 'react-hot-toast';

const routeToSlug: Record<string, string> = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/cancellation': 'cancellation',
  '/refund': 'refund',
};

const slugToTitle: Record<string, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cancellation: 'Cancellation Policy',
  refund: 'Refund Policy',
};

export default function ContentPage() {
  const location = useLocation();
  const slug = routeToSlug[location.pathname] || '';
  const [page, setPage] = useState<ContentPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        const res = await api.get(`/content/${slug}`);
        setPage(res.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load page');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600">The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {slugToTitle[slug] || slug}
        </h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div
            className="prose prose-lg prose-indigo max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Last updated:{' '}
          {new Date(page.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
