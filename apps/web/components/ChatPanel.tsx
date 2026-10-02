'use client';
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints } from '../lib/companion';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking } from '../lib/speech';
import { pickLine, type ChatterLang } from '../lib/chatter';
import { clientChat } from '../lib/client-chat';

interface Msg { role: 'user' | 'assistant'; content: string }

export interface ChatPanelProps {
  characterName?: string;
  lang?: ChatterLang;
  accent?: string;
  /** increments when the user pokes the character — triggers a poke reply */
  pokeCount?: number;
  onOpenSettings?: () => void;
}

const IDLE_AFTER_MS = 40_000;

export default function ChatPanel({
  characterName = 'Juno',
  lang = 'yue',
  accent = '#f9a8d4',
  pokeCount = 0,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const idleCounterRef = useRef(0);
  const tutorCounterRef = useRef(0);
  const greetedRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    saveHistory(history);
  }, [history]);

  const sayLocal = (text: string, hints?: Record<string, number>) => {
    feedUtterance(text);
    notifySpeaking(text);
    if (hints) applyLlmHints(hints);
    setHistory((h) => [...h, { role: 'assistant', content: text }]);
  };

  // startup greeting once, shortly after mount
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const t1 = setTimeout(() => sayLocal(pickLine('startup', lang, 0)), 1200);
    const t2 = setTimeout(() => sayLocal(pickLine('startup', lang, 1)), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // poke replies
  const lastPokeRef = useRef(pokeCount);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    sayLocal(pickLine('poke', lang, pokeCount), { surprise: 0.8, joy: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCount]);

  // idle chatter: if the user is quiet too long, Juno speaks up
  useEffect(() => {
    const timer = setInterval(() => {
      if (busyRef.current) return;
      if (Date.now() - lastActivityRef.current < IDLE_AFTER_MS) return;
      lastActivityRef.current = Date.now();
      sayLocal(pickLine('idleBored', lang, idleCounterRef.current++));
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    busyRef.current = true;
    lastActivityRef.current = Date.now();
    setHistory((h) => [...h, { role: 'user', content: text }]);
    feedUtterance(text);
    let answered = false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { reply?: string; emotionHints?: Record<string, number> };
      if (data.emotionHints) applyLlmHints(data.emotionHints);
      const reply = data.reply || '…';
      feedUtterance(reply);
      notifySpeaking(reply);
      setHistory((h) => [...h, { role: 'assistant', content: reply }]);
      answered = true;
    } catch {
      // no server (e.g. static GitHub Pages build) — free keyless LLM from the browser
      try {
        const r = await clientChat([...history, { role: 'user', content: text }], lang);
        applyLlmHints(r.emotionHints);
        feedUtterance(r.reply);
        notifySpeaking(r.reply);
        setHistory((h) => [...h, { role: 'assistant', content: r.reply }]);
        answered = true;
      } catch { /* fall through to the hiccup line */ }
    } finally {
      if (!answered) setHistory((h) => [...h, { role: 'assistant', content: '… (connection hiccup — I’m still here)' }]);
      setBusy(false);
      busyRef.current = false;
      lastActivityRef.current = Date.now();
    }
  };

  const tutor = () => {
    lastActivityRef.current = Date.now();
    sayLocal(pickLine('tutor', lang, tutorCounterRef.current++));
  };

  return (
    <div className="pointer-events-auto mx-auto flex h-72 w-full max-w-2xl flex-col gap-2 p-4">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto rounded-lg bg-black/40 p-3 text-sm">
        {history.length === 0 && <p className="text-neutral-400">Say hi to {characterName} 👋</p>}
        {history.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-right text-pink-300' : 'text-neutral-100'}>{m.content}</p>
        ))}
        {busy && <p className="text-neutral-400">{characterName} is typing…</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={tutor} title="What can I do?"
          className="rounded-lg bg-neutral-800 px-3 py-2 text-white">?</button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="Type something…"
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-white outline-none"
        />
        <button onClick={() => void send()} disabled={busy}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-50" style={{ backgroundColor: accent }}>Send</button>
      </div>
    </div>
  );
}
