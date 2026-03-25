import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-sans font-medium transition-colors ${
      isActive ? 'text-accent-glow' : 'text-prose hover:text-white'
    }`;

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
              <span className="text-white font-sans font-bold text-xs">C</span>
            </div>
            <span className="text-base font-sans font-bold text-white tracking-tight">Coursbit</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/create" className={navLinkClass}>Create</NavLink>
                <NavLink to="/billing" className={navLinkClass}>Billing</NavLink>
                <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>
                <NavLink to="/bookmarks" className={navLinkClass}>Bookmarks</NavLink>
                {user?.role === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
                )}

                {/* User Dropdown */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-sm font-sans text-prose hover:text-white transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-white font-medium max-w-[100px] truncate">{user?.name || 'User'}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-xl shadow-xl py-1 z-20">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-xs text-muted truncate">{user?.email}</p>
                          <p className="text-xs text-accent font-medium mt-0.5 capitalize">{user?.plan} plan</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-border/30 transition-colors font-sans"
                        >
                          Log out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <NavLink to="/pricing" className={navLinkClass}>Pricing</NavLink>
                <Link to="/login" className="text-sm font-sans text-prose hover:text-white transition-colors">Log in</Link>
                <Link to="/register" className="text-sm font-sans font-semibold px-4 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-glow transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-prose hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="px-4 py-4 space-y-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="font-medium text-white text-sm block">{user?.name || 'User'}</span>
                    <span className="text-xs text-muted">{user?.email}</span>
                  </div>
                </div>
                <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
                <NavLink to="/create" className={navLinkClass} onClick={() => setMobileOpen(false)}>Create Course</NavLink>
                <NavLink to="/billing" className={navLinkClass} onClick={() => setMobileOpen(false)}>Billing</NavLink>
                <NavLink to="/settings" className={navLinkClass} onClick={() => setMobileOpen(false)}>Settings</NavLink>
                <NavLink to="/bookmarks" className={navLinkClass} onClick={() => setMobileOpen(false)}>Bookmarks</NavLink>
                {user?.role === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>Admin</NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-sm font-sans font-medium text-red-400 hover:text-red-300 pt-3 border-t border-border"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/pricing" className={navLinkClass} onClick={() => setMobileOpen(false)}>Pricing</NavLink>
                <NavLink to="/login" className={navLinkClass} onClick={() => setMobileOpen(false)}>Log in</NavLink>
                <Link
                  to="/register"
                  className="block text-sm font-sans font-semibold text-center py-2 bg-accent text-white rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
