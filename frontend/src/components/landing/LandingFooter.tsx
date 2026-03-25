interface FooterLink {
  label: string;
  href: string;
}

const productLinks: FooterLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '#' },
];

const companyLinks: FooterLink[] = [
  { label: 'About', href: '#' },
  { label: 'Contact', href: '/contact' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

const resourceLinks: FooterLink[] = [
  { label: 'Documentation', href: '#' },
  { label: 'API', href: '#' },
  { label: 'Status', href: '#' },
  { label: 'Support', href: '/contact' },
];

const socialLinks = [
  { text: '𝕏', href: '#', label: 'Twitter' },
  { text: 'GH', href: '#', label: 'GitHub' },
  { text: 'in', href: '#', label: 'LinkedIn' },
  { text: 'YT', href: '#', label: 'YouTube' },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h4 className="text-xs font-sans font-medium text-white uppercase tracking-widest mb-4">
        {title}
      </h4>
      <ul className="space-y-0.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="block text-sm text-prose hover:text-white transition-colors py-1"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingFooter() {
  return (
    <footer className="py-16 lg:py-20 bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="inline-flex items-center gap-0">
              <span className="font-display font-bold text-xl text-white">
                Coursbit
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5 -mt-2" />
            </a>
            <p className="text-sm text-muted mt-3 max-w-xs leading-relaxed">
              AI-powered course generation for educators and creators.
            </p>
            <div className="flex gap-3 mt-4">
              {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="text-muted hover:text-accent transition-colors text-sm font-semibold leading-none"
                  >
                    {social.text}
                  </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">
            &copy; 2024 Coursbit. All rights reserved.
          </span>
          <span className="text-xs text-muted">
            Made with &hearts; using Gemini &amp; GPT-4o
          </span>
        </div>
      </div>
    </footer>
  );
}
