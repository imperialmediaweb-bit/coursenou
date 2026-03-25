import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted font-sans">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/cancellation" className="hover:text-white transition-colors">Cancellation</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Refund</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
          <p className="text-sm text-muted font-sans">
            &copy; {new Date().getFullYear()} Coursbit
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
