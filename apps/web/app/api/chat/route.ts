import { NextResponse } from 'next/server';
import { createLlm, OfflineLlm, PollinationsLlm, type ChatMessage } from '../../../lib/llm';

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const { message, history, language, persona, memory } = (body ?? {}) as { message?: unknown; history?: unknown; language?: unknown; persona?: unknown; memory?: unknown };
  if (typeof message !== 'string' || !message.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const safeHistory: ChatMessage[] = Array.isArray(history)
    ? history.filter((m): m is ChatMessage => m && typeof m === 'object' && typeof (m as ChatMessage).content === 'string').slice(-20)
    : [];
  const opts = {
    language: typeof language === 'string' ? language : undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    memory: typeof memory === 'string' ? memory : undefined,
  };
  const llm = createLlm();
  try {
    const result = await llm.chat([...safeHistory, { role: 'user', content: message }], opts);
    return NextResponse.json(result);
  } catch {
    // r.27 — before going offline, try the keyless free lane: a configured
    // provider whose account ran out of credit shouldn't dead-end the chat
    try {
      const free = await new PollinationsLlm().chat([...safeHistory, { role: 'user', content: message }], opts);
      return NextResponse.json(free);
    } catch {
      const fallback = await new OfflineLlm().chat([{ role: 'user', content: message }]);
      return NextResponse.json(fallback);
    }
  }
}
