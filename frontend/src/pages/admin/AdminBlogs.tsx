import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiPlus, HiPencilSquare, HiTrash } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Blog } from '../../types';

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await api.get('/admin/blogs');
      setBlogs(res.data);
    } catch {
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/blogs/${deleteId}`);
      toast.success('Blog deleted');
      setDeleteId(null);
      fetchBlogs();
    } catch {
      toast.error('Failed to delete blog');
    }
  };

  const togglePublished = async (blog: Blog) => {
    try {
      await api.put(`/admin/blogs/${blog._id}`, {
        ...blog,
        published: !blog.published,
      });
      toast.success(blog.published ? 'Blog unpublished' : 'Blog published');
      fetchBlogs();
    } catch {
      toast.error('Failed to update blog');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blogs</h1>
          <p className="text-gray-500 mt-1">{blogs.length} blog posts</p>
        </div>
        <Link
          to="/admin/blogs/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <HiPlus className="h-4 w-4" />
          New Blog
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {blogs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No blog posts yet. Create your first one!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blogs.map((blog) => (
              <div
                key={blog._id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{blog.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => togglePublished(blog)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      blog.published
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {blog.published ? 'Published' : 'Draft'}
                  </button>
                  <Link
                    to={`/admin/blogs/${blog._id}/edit`}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <HiPencilSquare className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setDeleteId(blog._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Blog</h3>
            <p className="text-gray-500 mt-2">
              Are you sure you want to delete this blog post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlogs;
