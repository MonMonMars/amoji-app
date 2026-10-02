'use client';
// Browser-direct chat for static hosting (GitHub Pages): no server route, so
// we call the free keyless Pollinations endpoint straight from the client.
import { BASE_SYSTEM, languageBlock, parseEmotionHints, type ChatMessage } from './llm';

export interface ClientChatResult { reply: string; emotionHints: Record<string, number> }

export async function clientChat(
  messages: ChatMessage[],
  opts?: { language?: string; persona?: string; memory?: string },
): Promise<ClientChatResult> {
  const system = `${BASE_SYSTEM}\n${languageBlock(opts?.language)}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}`;
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message.content ?? '';
  if (!content) throw new Error('pollinations empty');
  const hints = parseEmotionHints(content) as Record<string, number>;
  const reply = content.replace(/\[emotion:\{[^}]*\}\]/, '').trim();
  return { reply: reply || '…', emotionHints: hints };
}
