import { NextResponse } from 'next/server';
import { createLlm, OfflineLlm, type ChatMessage } from '../../../lib/llm';

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const { message, history, language, persona } = (body ?? {}) as { message?: unknown; history?: unknown; language?: unknown; persona?: unknown };
  if (typeof message !== 'string' || !message.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const safeHistory: ChatMessage[] = Array.isArray(history)
    ? history.filter((m): m is ChatMessage => m && typeof m === 'object' && typeof (m as ChatMessage).content === 'string').slice(-20)
    : [];
  const llm = createLlm();
  try {
    const result = await llm.chat([...safeHistory, { role: 'user', content: message }], {
      language: typeof language === 'string' ? language : undefined,
      persona: typeof persona === 'string' ? persona : undefined,
    });
    return NextResponse.json(result);
  } catch {
    const fallback = await new OfflineLlm().chat([{ role: 'user', content: message }]);
    return NextResponse.json(fallback);
  }
}
