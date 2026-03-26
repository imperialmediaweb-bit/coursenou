import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  topics: number;
  icon: string;
}

const CATEGORIES = ['All', 'Programming', 'Marketing', 'Creative', 'Business', 'Communication'];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/templates');
        setTemplates(res.data.data || res.data || []);
      } catch {
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-sans font-bold text-white mb-2">Course Templates</h1>
          <p className="text-prose text-sm">Start with a pre-built template and customize it with AI.</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-prose hover:text-white hover:border-accent/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <button
              key={template.id}
              onClick={() => navigate(`/create?template=${template.id}`)}
              className="bg-surface border border-border rounded-2xl p-6 text-left hover:border-accent/40 hover:shadow-[0_0_20px_rgba(108,71,255,0.08)] transition-all group"
            >
              <div className="text-3xl mb-3">{template.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-white font-sans font-semibold text-base group-hover:text-accent-glow transition-colors">
                  {template.title}
                </h3>
              </div>
              <p className="text-prose text-sm leading-relaxed mb-4">{template.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-medium text-muted uppercase tracking-wider bg-border/50 px-2 py-0.5 rounded">
                  {template.category}
                </span>
                <span className="text-xs text-muted">{template.topics} topics</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
