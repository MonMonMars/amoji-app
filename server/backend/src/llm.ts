import { offlineComplete, type ChatComplete } from './chat.js';

interface Provider {
  env: string;
  baseUrl: string;
  model: string;
}

const PROVIDERS: Provider[] = [
  { env: 'GEMINI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { env: 'GOOGLE_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { env: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { env: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: 'auto' },
  { env: 'GITHUB_TOKEN', baseUrl: 'https://models.inference.ai.azure.com', model: 'gpt-4o-mini' },
  { env: 'MOONSHOT_API_KEY', baseUrl: 'https://api.moonshot.ai/v1', model: 'kimi-k2.5' },
];

async function postChat(url: string, apiKey: string | undefined, model: string, messages: unknown, provider: string): Promise<{ content: string; provider: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.85 }),
  });
  if (!res.ok) throw new Error(`${provider} ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new Error(`${provider} empty`);
  return { content, provider };
}

/** Keyed provider when configured, otherwise the keyless Pollinations lane, then offline. */
export function liveComplete(): ChatComplete {
  return async (input) => {
    const forced = process.env.AMOJI_LLM_PROVIDER;
    if (forced === 'offline') return offlineComplete(input);
    for (const p of PROVIDERS) {
      const key = process.env[p.env];
      if (!key) continue;
      if (forced && !p.env.toLowerCase().startsWith(forced.toLowerCase())) continue;
      try {
        return await postChat(`${p.baseUrl}/chat/completions`, key, p.model, input.messages, p.env);
      } catch {
        /* try the free lane */
      }
    }
    if (forced === 'pollinations' || !forced) {
      try {
        return await postChat('https://text.pollinations.ai/openai', undefined, 'openai', input.messages, 'pollinations');
      } catch {
        return offlineComplete(input);
      }
    }
    return offlineComplete(input);
  };
}
