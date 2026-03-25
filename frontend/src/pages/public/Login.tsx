import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const DEMO_EMAIL = 'demo@coursbit.com';
const DEMO_PASSWORD = 'demo123456';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left side — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent/20 via-base to-accent/10 items-center justify-center p-12">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
              <span className="text-white font-sans font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-sans font-bold text-white tracking-tight">Coursbit</span>
          </div>

          <h2 className="text-4xl font-sans font-extrabold text-white leading-tight mb-4">
            Generate AI courses{' '}
            <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">
              in minutes.
            </span>
          </h2>

          <p className="text-prose text-base leading-relaxed mb-8">
            Create structured courses with AI-generated lessons, quizzes, certificates, and multimedia. Powered by Gemini, GPT-4o, and Claude.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['AI Generation', 'Quizzes', 'Certificates', 'PDF Export', '23 Languages', 'Audio'].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-sans text-prose"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-10 pt-8 border-t border-border/50">
            <div>
              <div className="text-2xl font-bold text-white">2,400+</div>
              <div className="text-xs text-muted font-sans">Creators</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">12,000+</div>
              <div className="text-xs text-muted font-sans">Courses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">23</div>
              <div className="text-xs text-muted font-sans">Languages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-base">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
              <span className="text-white font-sans font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-sans font-bold text-white tracking-tight">Coursbit</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-2xl font-sans font-bold text-white mb-2">Welcome back</h1>
            <p className="text-prose text-sm">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Demo account banner */}
          <button
            onClick={fillDemo}
            type="button"
            className="w-full mb-6 p-3.5 bg-accent/10 border border-accent/25 rounded-xl text-left hover:bg-accent/15 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-accent-glow transition-colors">
                  Try Demo Account
                </div>
                <div className="text-xs text-muted">
                  {DEMO_EMAIL} — instant access, no signup
                </div>
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted font-sans">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-prose mb-1.5 font-sans">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-white placeholder-muted text-sm font-sans outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-prose font-sans">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:text-accent-glow font-sans font-medium transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-white placeholder-muted text-sm font-sans outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-white font-sans font-semibold text-sm rounded-xl hover:bg-accent-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(108,71,255,0.25)] hover:shadow-[0_0_28px_rgba(108,71,255,0.4)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted font-sans">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-accent hover:text-accent-glow font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-muted/60 font-sans">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-prose transition-colors">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-prose transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
