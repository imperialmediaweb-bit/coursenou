import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <Link to="/terms" className="hover:text-primary-600 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-primary-600 transition-colors">
              Privacy
            </Link>
            <Link to="/cancellation" className="hover:text-primary-600 transition-colors">
              Cancellation Policy
            </Link>
            <Link to="/refund" className="hover:text-primary-600 transition-colors">
              Refund Policy
            </Link>
            <Link to="/contact" className="hover:text-primary-600 transition-colors">
              Contact
            </Link>
            <Link to="/blog" className="hover:text-primary-600 transition-colors">
              Blog
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            &copy; 2024 CourseBit. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
