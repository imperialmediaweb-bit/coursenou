import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * The AI provider is an operator decision, not a user preference — the
 * operator pays for the API keys. It previously existed only as a per-user
 * field with no control anywhere, so it could never actually be changed.
 */

interface Provider {
  value: string;
  label: string;
  description: string;
}

interface SettingsResponse {
  aiProvider: string;
  providers: Provider[];
  configured: Record<string, boolean>;
}

export default function AiProviderSetting() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/settings');
        setSettings(res.data);
        setSelected(res.data.aiProvider);
      } catch {
        toast.error('Failed to load platform settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.put('/admin/settings', { aiProvider: selected });
      setSettings(res.data);
      toast.success('AI provider updated for the whole platform');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to update AI provider');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />;
  }
  if (!settings) return null;

  const dirty = selected !== settings.aiProvider;

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white">AI Provider</h2>
      <p className="mt-1 mb-5 text-sm text-muted">
        Applies to every course, quiz and summary generated on the platform.
        Only providers with an API key configured can be selected.
      </p>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {settings.providers.map((provider) => {
          const configured = settings.configured[provider.value];
          const active = selected === provider.value;
          return (
            <button
              key={provider.value}
              type="button"
              disabled={!configured}
              onClick={() => setSelected(provider.value)}
              aria-pressed={active}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
              } ${configured ? '' : 'cursor-not-allowed opacity-40'}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{provider.label}</span>
                {active && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5l2.5 2.5 4.5-5" />
                    </svg>
                  </span>
                )}
              </div>
              <span className="text-xs leading-relaxed text-muted">{provider.description}</span>
              {!configured && (
                <span className="mt-2 block text-xs font-medium text-amber-400">
                  No API key configured
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-glow disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Provider'}
        </button>
        <span className="text-xs text-muted">
          Currently active: <strong className="text-white">{settings.aiProvider}</strong>
        </span>
      </div>
    </section>
  );
}
