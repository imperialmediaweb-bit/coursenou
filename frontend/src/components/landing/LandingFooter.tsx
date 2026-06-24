interface FooterLink {
  label: string;
  href: string;
  disabled?: boolean;
}

const productLinks: FooterLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog — Coming soon', href: '#', disabled: true },
];

const companyLinks: FooterLink[] = [
  { label: 'About — Coming soon', href: '#', disabled: true },
  { label: 'Contact', href: '/contact' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
];

const resourceLinks: FooterLink[] = [
  { label: 'Documentation — Coming soon', href: '#', disabled: true },
  { label: 'API — Coming soon', href: '#', disabled: true },
  { label: 'Status — Coming soon', href: '#', disabled: true },
  { label: 'Support', href: '/contact' },
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
            {link.disabled ? (
              <span className="block text-sm text-muted/50 py-1 cursor-not-allowed">
                {link.label}
              </span>
            ) : (
              <a
                href={link.href}
                className="block text-sm text-prose hover:text-white transition-colors py-1"
              >
                {link.label}
              </a>
            )}
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
            <a href="/" className="inline-flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                <span className="text-white font-sans font-bold text-xs">C</span>
              </div>
              <span className="font-sans font-bold text-lg text-white tracking-tight">
                Coursbit
              </span>
            </a>
            <p className="text-sm text-muted mt-3 max-w-xs leading-relaxed">
              AI-powered course generation for educators and creators.
            </p>
          </div>

          {/* Link columns */}
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Coursbit. All rights reserved.
          </span>
          <span className="text-xs text-muted">
            Made with &hearts; using Gemini &amp; GPT-4o
          </span>
        </div>
      </div>
    </footer>
  );
}
