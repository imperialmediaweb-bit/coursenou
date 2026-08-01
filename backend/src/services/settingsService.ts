import prisma from '../utils/prisma';

/**
 * Platform-wide settings the owner controls from the admin panel.
 *
 * The AI provider used to be a per-user preference, which is wrong for this
 * product: the operator pays for the API keys, so the operator decides which
 * model runs. Users had no legitimate reason to switch it — and the control
 * was never rendered anyway, so the field only ever held its default.
 */

export type AiProvider = 'openai' | 'gemini' | 'claude';

export const AI_PROVIDERS: { value: AiProvider; label: string; description: string }[] = [
  { value: 'openai', label: 'OpenAI GPT-4o', description: 'Best overall quality. Requires OPENAI_API_KEY.' },
  { value: 'gemini', label: 'Google Gemini', description: 'Fastest and cheapest. Requires GEMINI_API_KEY.' },
  { value: 'claude', label: 'Anthropic Claude', description: 'Strongest long-form writing. Requires CLAUDE_API_KEY.' },
];

const KEY_AI_PROVIDER = 'aiProvider';

// Read on nearly every generation, so it is cached rather than queried each
// time. Short TTL keeps an admin change visible without a restart.
let cache: { value: AiProvider; readAt: number } | null = null;
const TTL_MS = 30_000;

const isProvider = (value: unknown): value is AiProvider =>
  value === 'openai' || value === 'gemini' || value === 'claude';

/** The provider every generation should use. */
export async function getAiProvider(): Promise<AiProvider> {
  if (cache && Date.now() - cache.readAt < TTL_MS) return cache.value;

  const envDefault = isProvider(process.env.DEFAULT_AI_PROVIDER)
    ? process.env.DEFAULT_AI_PROVIDER
    : 'openai';

  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY_AI_PROVIDER } });
    const value = isProvider(row?.value) ? row.value : envDefault;
    cache = { value, readAt: Date.now() };
    return value;
  } catch {
    // A database hiccup must not stop course generation.
    return envDefault;
  }
}

export async function setAiProvider(value: AiProvider): Promise<AiProvider> {
  if (!isProvider(value)) {
    throw new Error('Unknown AI provider');
  }
  await prisma.appSetting.upsert({
    where: { key: KEY_AI_PROVIDER },
    create: { key: KEY_AI_PROVIDER, value },
    update: { value },
  });
  cache = { value, readAt: Date.now() };
  return value;
}

/** Which providers actually have a key configured, for the admin screen. */
export function configuredProviders(): Record<AiProvider, boolean> {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    claude: !!process.env.CLAUDE_API_KEY,
  };
}
