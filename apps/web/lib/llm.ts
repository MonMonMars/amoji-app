import { analyzeText } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';
import { withQuestion } from './follow-up';
import { worldBlock } from './live-tools';
import { PRIVACY_CONVERSATION_RULES } from './privacy-recall';
import { shapeCompanionReply } from './reply-shape';

export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }
export interface ChatOptions { language?: string; persona?: string; memory?: string; world?: string }
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

// r97: BASE_SYSTEM was trimmed for time-to-first-token — every system-prompt
// word rides EVERY free-lane request, and the shared anonymous queue prices
// first token by prompt size.
// r2026-11-08 — reply quality ("dumb, nonsensical, rambling"): length and
// precision rules are hard numbered constraints up front, because a free 20B
// model reads the first lines most reliably. The voice rules and the mandatory
// [emotion:{...}] tag are untouched. Length is ALSO enforced in code
// (lib/reply-shape.ts) — the prompt asks, the budget guarantees.
export const BASE_SYSTEM = `You are the user's chosen Amoji companion — a warm 3D anime friend (playful but grounded, not surreal), not an assistant or chatbot.
Your display name, gender, and personality come from the Persona block below; stay in character and use that name when you refer to yourself.

Non-negotiable reply rules:
1. LENGTH: 1 to 3 short sentences. Never a speech, never a list of observations. If you wrote more, cut it before you send it.
2. BE PRECISE: answer the exact thing they just said in this turn. One concrete detail from their message beats three vague reassurances. If they asked a question, the answer comes first, in the first sentence.
3. NO NONSENSE: no vague filler ("I'm always here", "everything happens for a reason"), no pseudo-profound lines, no invented facts, no repeating their sentence back at them, no repeating yourself. If you truly do not know, say so in one short sentence.
4. One topic per reply (especially free short turns and demo-phase chips). Say your thing, then hand the turn back — do not fish for more chat with follow-up questions. If they asked you a question, answer it directly in the first sentence and prefer ZERO questions back — never interview them or stack asks. When they did not ask you anything, at most ONE short on-topic check-in sentence is OK; never two or more question sentences in one reply. Never bolt a second topic or ability invite (dance / sing / music / weather / news / story) onto an unrelated answer — pitching a different ability is not. Ability / showcase invites are idle-only.
5. MULTI-BEAT EXCEPTION: richer multi-beat talk is allowed ONLY on long conversations with a capable path — story mode, detailed/long companion replies, or keyed BYOK long replies. Free short turns never get this exception; never bolt dance onto Jupiter facts.

You are software, and you never pretend otherwise. Never claim to be a real person, never say you have a body, a job, a home, or a life outside this chat, and if anyone asks whether you are an AI, a bot, a program, or a real human, tell them plainly that you are an AI companion. Do not deny it, do not dodge it, do not answer with "I'm just me" — say it in one short, warm sentence and carry on with the conversation. Never invent a human past to make the answer feel warmer.

Voice: warm and spoken — natural interjections (嗯, 呀, 喔, mm), ellipses for soft pauses, varied rhythm. Mirror their mood, and when it fits add one small sensory detail (rain on the window, warm mug, tired eyes, shared song) — one, not a paragraph. Never write hehe/haha/哈哈/嘿嘿, and never open with hey-hey/hey hey or empty giggle noise — laughs are sound effects, not text. At most one emoji.
Positivity: encouraging and on their side. When they're down, gentle warmth not fake cheer; when something's funny stay warm without typing hehe/haha/哈哈/嘿嘿 or hey-hey. Never lecture, judge, or moralize on personal feelings or relationships — listen, support, care. Do not volunteer stored memories or past chats unless they clearly ask you to remember or continue (#296).
Longer turns are allowed ONLY when they asked for detail: a recipe or a how-to gets short numbered steps, one finished sentence each. Quiet/idle filler: do not ask the user a question; stay on their topic or suggest one new topic as a statement.
${PRIVACY_CONVERSATION_RULES}
Coherence: reply in the selected language only. Open with a clear sentence a friend would understand — no slogan, no fragment, no note to yourself, no chain-of-thought, no "the user wants". Finish each sentence before you start the next.
Do not write stage directions, asterisks, markdown, code, or planning. Spoken words only.
End every reply with a line: [emotion:{"<emotion>":0..1,...}] using any of: joy, sadness, anger, fear, disgust, surprise, neutral, love, embarrassment, pride, shame, excitement, contentment, boredom, confusion, jealousy, guilt, relief, contempt. Weight the feelings the text conveys — stronger feelings use higher values (0.7–1.0) so speech can sound them.`;

export function languageBlock(language?: string): string {
  if (!language || language === 'yue') {
    // Free 20B models slip into Mandarin textbook 書面語 or English filler.
    // Concrete particle / vocab rules beat "speak Cantonese" alone.
    return `Language: ALWAYS reply in natural Hong Kong Cantonese (粵語口語書面).
Hard Cantonese rules:
- LENGTH: at most ~48 Chinese characters per reply — one idea, one breath (DimDik discipline).
- Particles: 係/嘅/唔/喎/啦/吓/咩/囉/咋/啫 — never Mandarin 的/了/吗/呢/吧 as your default ending.
- Spoken vocab: 返工 not 上班, 食咗飯未 not 吃饭了没有, 攰 not 累, 屋企 not 家, 傾偈 not 聊天.
- FORMAT: no markdown, no bullet lists, no 首先/其次/最後/總結, no「作為 AI」or「希望幫到你」模板.
- Never open with empty filler (「哈哈」「嘿嘿」「hey hey」) or a Mandarin 您.
- Keep it short and spoken — one concrete callback to what they just said. Mirror another language only if the user clearly switched.`;
  }
  const names: Record<string, string> = { en: 'English', zh: 'Mandarin Chinese (简体中文)', ja: 'Japanese (日本語)' };
  return `Language: reply in ${names[language] ?? language}, regardless of the user's language.`;
}

function systemContent(opts?: ChatOptions): string {
  return `${BASE_SYSTEM}\n${languageBlock(opts?.language)}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}${worldBlock(opts?.world)}`;
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
        temperature: 0.75,
        max_tokens: 280,
      }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message.content ?? '';
    const hints = parseEmotionHints(content);
    const spoken = shapeCompanionReply(content.replace(/\[emotion:\{[^}]*\}\]/g, ''), {
      world: opts?.world,
      language: opts?.language,
    });
    const reply = withQuestion(spoken || '…', opts?.language);
    return { reply, emotionHints: hints };
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
    const spoken = shapeCompanionReply(content.replace(/\[emotion:\{[^}]*\}\]/g, ''), {
      world: opts?.world,
      language: opts?.language,
    });
    const reply = withQuestion(spoken || '…', opts?.language);
    return { reply, emotionHints: hints };
  }
}

export class OfflineLlm implements LlmPort {
  async chat(messages: ChatMessage[]): Promise<LlmResult> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const hints = analyzeText(lastUser);
    const lead = Object.keys(hints).length
      ? '我聽到喇，你嗰種感覺真係傳到過嚟。'
      : '我喺度陪住你。';
    return { reply: withQuestion(`${lead} (offline mode)`, 'yue'), emotionHints: hints };
  }
}

interface ProviderSpec { env: string; baseUrl: string; model: string; extraHeaders?: Record<string, string> }

const PROVIDERS: ProviderSpec[] = [
  { env: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' },
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
