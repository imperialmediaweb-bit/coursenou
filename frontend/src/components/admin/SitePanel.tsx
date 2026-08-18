import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * How the site presents itself to everything that is not a signed-in user:
 * search engines, link previews, and whichever analytics tool the operator
 * already uses.
 *
 * Analytics is a snippet rather than a built-in integration on purpose.
 * Plausible, Google Analytics, PostHog, Fathom and Umami are all a script tag,
 * and an operator who has already chosen one should not have to wait for this
 * platform to add support for it.
 */

interface SiteConfig {
  siteName: string;
  description: string;
  siteUrl: string;
  analyticsSnippet: string;
  indexable: boolean;
}

const EXAMPLES = [
  {
    name: 'Plausible',
    snippet: '<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>',
  },
  {
    name: 'Google Analytics',
    snippet:
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'G-XXXXXXX\');</script>',
  },
  {
    name: 'PostHog',
    snippet:
      '<script>!function(t,e){/* paste the snippet PostHog gives you */}(document,window.posthog||[]);</script>',
  },
];

export default function SitePanel() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/site');
        setConfig(res.data);
        setDraft(res.data);
      } catch {
        toast.error('Failed to load site settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const res = await api.put('/admin/site', draft);
      setConfig(res.data);
      setDraft(res.data);
      toast.success('Saved. Live within a minute.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-72 animate-pulse rounded-xl border border-border bg-surface" />;
  }
  if (!config || !draft) return null;

  const dirty = JSON.stringify(config) !== JSON.stringify(draft);
  const set = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) =>
    setDraft({ ...draft, [key]: value });

  const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary-500 focus:outline-none';

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white">Site &amp; Analytics</h2>
      <p className="mt-1 mb-5 text-sm text-muted">
        What search engines and link previews say about the site, and which analytics
        script runs on it.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="site-name" className="mb-1 block text-sm font-medium text-gray-300">
            Site name
          </label>
          <input
            id="site-name"
            className={inputClass}
            value={draft.siteName}
            onChange={(e) => set('siteName', e.target.value)}
            placeholder="Coursbit"
          />
        </div>

        <div>
          <label htmlFor="site-url" className="mb-1 block text-sm font-medium text-gray-300">
            Site URL
          </label>
          <input
            id="site-url"
            className={inputClass}
            value={draft.siteUrl}
            onChange={(e) => set('siteUrl', e.target.value.trim())}
            placeholder="https://example.com"
          />
          <p className="mt-1 text-xs text-muted">
            Used for canonical links and the sitemap, which cannot be relative.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="site-description" className="mb-1 block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          id="site-description"
          className={`${inputClass} min-h-[76px] resize-y`}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">
          {draft.description.length} characters — search results cut off around 160.
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="analytics" className="mb-1 block text-sm font-medium text-gray-300">
          Analytics snippet
        </label>
        <textarea
          id="analytics"
          className={`${inputClass} min-h-[110px] resize-y font-mono text-xs`}
          value={draft.analyticsSnippet}
          onChange={(e) => set('analyticsSnippet', e.target.value)}
          placeholder="Paste the <script> tag your analytics provider gives you"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted">
          Injected into every page before the app loads. The security policy is opened
          automatically for the hosts this snippet uses — no other change needed.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => set('analyticsSnippet', example.snippet)}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:border-primary-500 hover:text-white"
            >
              Insert {example.name} example
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border bg-background"
          checked={draft.indexable}
          onChange={(e) => set('indexable', e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-gray-300">
            Allow search engines to index this site
          </span>
          <span className="block text-xs text-muted">
            Turn off for a staging copy. While off, robots.txt refuses everything and the
            sitemap is withdrawn — leaving it off in production is the usual way to launch
            a site nobody can find.
          </span>
        </span>
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {dirty && !saving && <span className="text-xs text-muted">Unsaved changes</span>}
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-muted underline-offset-4 hover:text-white hover:underline"
        >
          View sitemap.xml
        </a>
        <a
          href="/robots.txt"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted underline-offset-4 hover:text-white hover:underline"
        >
          View robots.txt
        </a>
      </div>
    </section>
  );
}
