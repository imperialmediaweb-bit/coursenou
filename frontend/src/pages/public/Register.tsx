import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-white placeholder-muted text-sm font-sans outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all';

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left side — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent/20 via-base to-accent/10 items-center justify-center p-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
              <span className="text-white font-sans font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-sans font-bold text-white tracking-tight">Coursbit</span>
          </div>

          <h2 className="text-4xl font-sans font-extrabold text-white leading-tight mb-4">
            Create your{' '}
            <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">
              free account
            </span>
          </h2>

          <p className="text-prose text-base leading-relaxed mb-8">
            Start generating AI-powered courses in minutes. No credit card required. Get access to Gemini, GPT-4o, and Claude.
          </p>

          <div className="space-y-4">
            {[
              '10 free courses with AI generation',
              'PDF export & certificates',
              'AI quizzes in 23 languages',
              'Switch AI providers anytime',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-prose">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — register form */}
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
            <h1 className="text-2xl font-sans font-bold text-white mb-2">Create your account</h1>
            <p className="text-prose text-sm">
              Start generating courses with AI for free
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-prose mb-1.5 font-sans">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-prose mb-1.5 font-sans">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-prose mb-1.5 font-sans">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-prose mb-1.5 font-sans">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Repeat your password"
                required
                minLength={8}
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted font-sans">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-accent hover:text-accent-glow font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-muted/60 font-sans">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-prose transition-colors">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-prose transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
