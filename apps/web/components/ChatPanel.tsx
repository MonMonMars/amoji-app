'use client';
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints } from '../lib/companion';
import { loadHistory, saveHistory } from '../lib/companion-store';

interface Msg { role: 'user' | 'assistant'; content: string }

export default function ChatPanel() {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    saveHistory(history);
  }, [history]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setHistory((h) => [...h, { role: 'user', content: text }]);
    feedUtterance(text);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json() as { reply?: string; emotionHints?: Record<string, number> };
      if (data.emotionHints) applyLlmHints(data.emotionHints);
      setHistory((h) => [...h, { role: 'assistant', content: data.reply || '…' }]);
    } catch {
      setHistory((h) => [...h, { role: 'assistant', content: '… (connection hiccup — I’m still here)' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto mx-auto flex h-72 w-full max-w-2xl flex-col gap-2 p-4">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto rounded-lg bg-black/40 p-3 text-sm">
        {history.length === 0 && <p className="text-neutral-400">Say hi to Juno 👋</p>}
        {history.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-right text-pink-300' : 'text-neutral-100'}>{m.content}</p>
        ))}
        {busy && <p className="text-neutral-400">Juno is typing…</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="Type something…"
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-white outline-none"
        />
        <button onClick={() => void send()} disabled={busy}
          className="rounded-lg bg-pink-500 px-4 py-2 text-white disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
