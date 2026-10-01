import { analyzeText } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';

export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }
export interface LlmResult { reply: string; emotionHints: Partial<Record<EmotionId, number>> }
export interface LlmPort { chat(messages: ChatMessage[]): Promise<LlmResult> }

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

const SYSTEM_PROMPT = `You are Juno, a warm 3D companion. Keep replies under 2 short sentences, cozy and personal.
End every reply with a line: [emotion:{"<emotion>":0..1,...}] using any of: joy, sadness, anger, fear, disgust, surprise, neutral, love, embarrassment, pride, shame, excitement, contentment, boredom, confusion, jealousy, guilt, relief, contempt. Only real emotions the text conveys.`;

export class MoonshotLlm implements LlmPort {
  constructor(private apiKey: string, private baseUrl = 'https://api.moonshot.ai/v1', private model = 'kimi-k2.5') {}
  async chat(messages: ChatMessage[]): Promise<LlmResult> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], temperature: 0.8 }),
    });
    if (!res.ok) throw new Error(`moonshot ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message.content ?? '';
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
      ? 'I hear you — that really comes through.'
      : "I'm here with you.";
    return { reply: `${lead} (offline mode)`, emotionHints: hints };
  }
}

export function createLlm(): LlmPort {
  const key = process.env.MOONSHOT_API_KEY;
  return key ? new MoonshotLlm(key) : new OfflineLlm();
}
