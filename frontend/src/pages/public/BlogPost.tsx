import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Blog } from '../../types';
import toast from 'react-hot-toast';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await api.get(`/blogs/${slug}`);
        setBlog(res.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load blog post');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-prose mb-6">The blog post you are looking for does not exist.</p>
          <Link
            to="/blog"
            className="text-accent hover:text-accent-glow font-medium"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/blog"
          className="inline-flex items-center text-accent hover:text-accent-glow font-medium mb-8"
        >
          &larr; Back to Blog
        </Link>

        {blog.coverImage && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img
              src={blog.coverImage}
              alt={blog.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <p className="text-sm text-accent font-medium mb-3">
          {new Date(blog.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
          {blog.title}
        </h1>

        <div
          className="prose prose-lg prose-indigo max-w-none"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </div>
    </div>
  );
}
