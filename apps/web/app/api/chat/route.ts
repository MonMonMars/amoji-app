import { NextResponse } from 'next/server';
import { createLlm, OfflineLlm, PollinationsLlm, type ChatMessage } from '../../../lib/llm';
import { withQuestion } from '../../../lib/follow-up';
import { preferLiveReply, serverLiveContext } from '../../../lib/live-tools';

function requestIp(req: Request): string | undefined {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? undefined;
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const { message, history, language, persona, memory, world, worldSpoken } = (body ?? {}) as {
    message?: unknown; history?: unknown; language?: unknown; persona?: unknown; memory?: unknown; world?: unknown; worldSpoken?: unknown;
  };
  if (typeof message !== 'string' || !message.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const safeHistory: ChatMessage[] = Array.isArray(history)
    ? history.filter((m): m is ChatMessage => m && typeof m === 'object' && typeof (m as ChatMessage).content === 'string').slice(-20)
    : [];
  const opts = {
    language: typeof language === 'string' ? language : undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    memory: typeof memory === 'string' ? memory : undefined,
  };
  // The browser lane usually fetches live facts itself (it can ask for
  // geolocation). Direct API callers, and a browser fetch that came back
  // empty, get the same step here from the server.
  let worldPrompt = typeof world === 'string' ? world.trim().slice(0, 1200) : '';
  let spoken = typeof worldSpoken === 'string' ? worldSpoken.trim().slice(0, 600) : '';
  if (!worldPrompt) {
    const priorUser = [...safeHistory].reverse().find((m) => m.role === 'user')?.content;
    try {
      const live = await serverLiveContext(message, { lang: opts.language, priorUser, clientIp: requestIp(req) });
      worldPrompt = live.prompt;
      if (!spoken) spoken = live.spoken;
    } catch { /* chat still answers without live facts */ }
  }
  const chatOpts = { ...opts, world: worldPrompt || undefined };
  const messages: ChatMessage[] = [...safeHistory, { role: 'user', content: message }];
  const llm = createLlm();
  try {
    const result = await llm.chat(messages, chatOpts);
    return NextResponse.json({
      ...result,
      reply: preferLiveReply(result.reply, worldPrompt, spoken, opts.language),
    });
  } catch {
    // r.27 — before going offline, try the keyless free lane: a configured
    // provider whose account ran out of credit shouldn't dead-end the chat
    try {
      const free = await new PollinationsLlm().chat(messages, chatOpts);
      return NextResponse.json({
        ...free,
        reply: preferLiveReply(free.reply, worldPrompt, spoken, opts.language),
      });
    } catch {
      if (spoken) return NextResponse.json({ reply: withQuestion(spoken, opts.language), emotionHints: {} });
      const fallback = await new OfflineLlm().chat([{ role: 'user', content: message }]);
      return NextResponse.json(fallback);
    }
  }
}
