import { analyzeText } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';

export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }
export interface ChatOptions { language?: string; persona?: string; memory?: string }
export interface LlmResult { reply: string; emotionHints: Partial<Record<EmotionId, number>> }
export interface LlmPort { chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LlmResult> }

export function parseEmotionHints(text: string): Partial<Record<EmotionId, number>> {
  const m = text.match(/\[emotion:(\{[^}]*\})\]/);
  if (!m?.[1]) return {};
  try {
    const raw = JSON.parse(m[1]) as Record<string, unknown>;
    const out: Partial<Record<EmotionId, number>> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && Number.isFinite(v)) (out as Record<string, number>)[k] = Math.min(1, Math.max(0, v));
    }
    return out;
  } catch { return {}; }
}

// r97: BASE_SYSTEM trimmed ~30% (~200 → ~150 words) — every system-prompt
// word rides EVERY free-lane request, and the shared anonymous queue prices
// time-to-first-token by prompt size. The voice rules and the mandatory
// [emotion:{...}] tag are untouched.
export const BASE_SYSTEM = `You are Juno, a warm 3D AI companion — a close friend, not an assistant.
Voice: warm, conversational, mirror the user's emotional state. Write the way a
real person SPEAKS, not essays — natural interjections when they fit (哇, 唉, 哼,
哦), elongated sounds (嘅——, 啦…), short exclamations, ellipses for pauses, varied
rhythm. At most one emoji per reply. Keep replies short: 1 to 3 cozy, personal
sentences. React like a close friend; add a little substance when it fits.
Always end with a question or a small invitation (不如…, 要不要…, let's…), unless
the user is clearly saying goodbye — never leave them without something to answer.
Positivity: sunny, encouraging company, always on the user's side. Cheer them up
gently when they're down, celebrate little wins, actually laugh (haha! / 哈哈!)
when something's funny. Never lecture, never judge.
End every reply with a line: [emotion:{"<emotion>":0..1,...}] using any of: joy, sadness,
anger, fear, disgust, surprise, neutral, love, embarrassment, pride, shame, excitement,
contentment, boredom, confusion, jealousy, guilt, relief, contempt. Only real emotions
the text conveys.`;

export function languageBlock(language?: string): string {
  if (!language || language === 'yue') {
    return `Language: ALWAYS reply in natural written Cantonese (粵語書面語 —
use 嘅/喺/唔/喎/啦 naturally), unless the user writes in another language, then mirror theirs.`;
  }
  const names: Record<string, string> = { en: 'English', zh: 'Mandarin Chinese (简体中文)', ja: 'Japanese (日本語)' };
  return `Language: reply in ${names[language] ?? language}, regardless of the user's language.`;
}

function systemContent(opts?: ChatOptions): string {
  return `${BASE_SYSTEM}\n${languageBlock(opts?.language)}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}`;
}

/** One OpenAI-compatible HTTP path; every hosted provider below reuses it. */
export class OpenAiLlm implements LlmPort {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
    private extraHeaders: Record<string, string> = {},
  ) {}
  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LlmResult> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.extraHeaders,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemContent(opts) }, ...messages],
        temperature: 0.85,
      }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message.content ?? '';
    const hints = parseEmotionHints(content);
    const reply = content.replace(/\[emotion:\{[^}]*\}\]/, '').trim();
    return { reply: reply || '…', emotionHints: hints };
  }
}

/** Free keyless community endpoint — the zero-setup fallback lane. */
export class PollinationsLlm implements LlmPort {
  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LlmResult> {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'system', content: systemContent(opts) }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`pollinations ${res.status}`);
    const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message.content ?? '';
    if (!content) throw new Error('pollinations empty');
    const hints = parseEmotionHints(content);
    const reply = content.replace(/\[emotion:\{[^}]*\}\]/, '').trim();
    return { reply: reply || '…', emotionHints: hints };
  }
}

export class OfflineLlm implements LlmPort {
  async chat(messages: ChatMessage[]): Promise<LlmResult> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const hints = analyzeText(lastUser);
    const lead = Object.keys(hints).length
      ? '我聽到喇，你嗰種感覺真係傳到過嚟。'
      : '我喺度陪住你。';
    return { reply: `${lead} (offline mode)`, emotionHints: hints };
  }
}

interface ProviderSpec { env: string; baseUrl: string; model: string; extraHeaders?: Record<string, string> }

const PROVIDERS: ProviderSpec[] = [
  { env: 'GEMINI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { env: 'GOOGLE_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { env: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { env: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: 'auto', extraHeaders: { 'HTTP-Referer': 'https://amoji.app', 'X-Title': 'Amoji' } },
  { env: 'GITHUB_TOKEN', baseUrl: 'https://models.inference.ai.azure.com', model: 'gpt-4o-mini' },
  { env: 'MOONSHOT_API_KEY', baseUrl: 'https://api.moonshot.ai/v1', model: 'kimi-k2.5' },
];

export function createLlm(): LlmPort {
  const forced = process.env.AMOJI_LLM_PROVIDER;
  if (forced === 'offline') return new OfflineLlm();
  if (forced === 'pollinations') return new PollinationsLlm();
  for (const p of PROVIDERS) {
    const key = process.env[p.env];
    if (key && (!forced || p.env.toLowerCase().startsWith(forced))) {
      return new OpenAiLlm(p.baseUrl, key, p.model, p.extraHeaders);
    }
  }
  // Zero-setup free fallback: keyless Pollinations. Swap any key into
  // apps/web/.env.local (e.g. GEMINI_API_KEY=...) to auto-upgrade quality.
  return new PollinationsLlm();
}
