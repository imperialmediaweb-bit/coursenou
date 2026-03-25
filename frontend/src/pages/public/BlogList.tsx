import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Blog } from '../../types';
import toast from 'react-hot-toast';

export default function BlogList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await api.get('/blogs');
        setBlogs(Array.isArray(res.data) ? res.data : res.data.data || []);
      } catch {
        toast.error('Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-prose">
            Tips, tutorials, and updates from the CourseBit team.
          </p>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-lg">No blog posts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link
                key={blog._id}
                to={`/blog/${blog.slug}`}
                className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow group"
              >
                {blog.coverImage && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={blog.coverImage}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <p className="text-sm text-accent font-medium mb-2">
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-accent transition-colors">
                    {blog.title}
                  </h2>
                  <p className="text-prose line-clamp-3">
                    {blog.content.replace(/<[^>]*>/g, '').slice(0, 150)}...
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
