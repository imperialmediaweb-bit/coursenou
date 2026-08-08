import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * API keys and credentials, editable here instead of in the hosting dashboard.
 *
 * Everything used to live in environment variables, so changing a Stripe key
 * meant finding the right Railway project, editing a variable and waiting for a
 * redeploy. Someone who bought this to run a business should not have to touch
 * infrastructure to do it.
 *
 * Stored values are encrypted and never sent back — a saved credential shows
 * only enough to recognise which one it is.
 */

interface Setting {
  name: string;
  label: string;
  group: string;
  help: string;
  plain: boolean;
  configured: boolean;
  source: 'panel' | 'environment' | null;
  preview: string;
}

interface Group {
  id: string;
  title: string;
  description: string;
}

interface CheckResult {
  group: string;
  ok: boolean;
  message: string;
  detail?: string;
}

export default function CredentialsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CheckResult[]>>({});
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/admin/secrets');
      setGroups(res.data.groups || []);
      setSettings(res.data.settings || []);
    } catch {
      toast.error('Could not load the settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (name: string) => {
    const value = drafts[name] ?? '';
    try {
      setSaving(name);
      const res = await api.put('/admin/secrets', { name, value });
      setGroups(res.data.groups || groups);
      setSettings(res.data.settings || []);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      toast.success(value.trim() === '' ? 'Cleared' : 'Saved');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Could not save');
    } finally {
      setSaving(null);
    }
  };

  const test = async (groupId: string) => {
    try {
      setTesting(groupId);
      const res = await api.post(`/admin/secrets/${groupId}/test`);
      setResults((prev) => ({ ...prev, [groupId]: res.data.data || [] }));
    } catch {
      toast.error('Could not run the check');
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white">API keys and credentials</h2>
      <p className="mb-6 mt-1 text-sm text-muted">
        Set these here rather than in your hosting dashboard. Changes take effect within a
        minute — no redeploy. Credentials are stored encrypted and are never shown again
        once saved.
      </p>

      <div className="space-y-3">
        {groups.map((group) => {
          const items = settings.filter((s) => s.group === group.id);
          const configured = items.filter((s) => s.configured).length;
          const expanded = open === group.id;
          const checks = results[group.id];

          return (
            <div key={group.id} className="rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : group.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">{group.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{group.description}</span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      configured === 0
                        ? 'bg-border/50 text-muted'
                        : configured === items.length
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {configured} of {items.length} set
                  </span>
                  <svg
                    className={`h-4 w-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {expanded && (
                <div className="space-y-5 border-t border-border p-4">
                  {items.map((setting) => {
                    const draft = drafts[setting.name];
                    const editing = draft !== undefined;

                    return (
                      <div key={setting.name}>
                        <label
                          htmlFor={setting.name}
                          className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-prose"
                        >
                          {setting.label}
                          {setting.source === 'environment' && (
                            <span className="rounded bg-border/60 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted">
                              from hosting
                            </span>
                          )}
                        </label>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            id={setting.name}
                            name={setting.name}
                            type={setting.plain || editing ? 'text' : 'password'}
                            autoComplete="off"
                            spellCheck={false}
                            value={editing ? draft : setting.preview}
                            placeholder={setting.configured ? '' : 'Not set'}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [setting.name]: e.target.value }))
                            }
                            onFocus={() => {
                              if (!editing) {
                                setDrafts((prev) => ({
                                  ...prev,
                                  [setting.name]: setting.plain ? setting.preview : '',
                                }));
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-base px-3 py-2 font-mono text-sm text-white outline-none transition-colors placeholder-muted focus:border-accent focus:ring-2 focus:ring-accent/40"
                          />
                          {editing && (
                            <button
                              onClick={() => save(setting.name)}
                              disabled={saving === setting.name}
                              className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-glow disabled:opacity-50"
                            >
                              {saving === setting.name ? 'Saving…' : 'Save'}
                            </button>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted">{setting.help}</p>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <button
                      onClick={() => test(group.id)}
                      disabled={testing === group.id}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-prose transition-colors hover:text-white disabled:opacity-50"
                    >
                      {testing === group.id ? 'Checking…' : 'Test these credentials'}
                    </button>
                    <span className="text-xs text-muted">
                      Asks the provider directly, so you find out here rather than when a
                      customer does.
                    </span>
                  </div>

                  {checks && (
                    <ul className="space-y-2">
                      {checks.map((check, i) => (
                        <li
                          key={i}
                          className={`rounded-lg border p-3 text-sm ${
                            check.ok
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {check.message}
                          {check.detail && (
                            <span className="mt-1 block text-xs opacity-80">{check.detail}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
