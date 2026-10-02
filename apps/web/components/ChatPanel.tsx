'use client';
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints } from '../lib/companion';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { clientChat } from '../lib/client-chat';
import { speak, stopSpeaking, voiceEnabled, setVoiceEnabled } from '../lib/voice';
import { t, type Lang } from '../lib/prefs';

interface Msg { role: 'user' | 'assistant'; content: string }

export interface ChatPanelProps {
  characterName?: string;
  characterId?: string;
  lang?: Lang;
  accent?: string;
  persona?: string;
  /** increments when the user pokes the character — triggers a poke reply */
  pokeCount?: number;
  onOpenSettings?: () => void;
}

const IDLE_AFTER_MS = 40_000;

export default function ChatPanel({
  characterName = 'Juno',
  characterId = 'juno',
  lang = 'yue',
  accent = '#f9a8d4',
  persona,
  pokeCount = 0,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const idleCounterRef = useRef(0);
  const tutorCounterRef = useRef(0);
  const greetedRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
    setVoiceOn(voiceEnabled());
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    saveHistory(history);
  }, [history]);

  const sayLocal = (text: string, hints?: Record<string, number>) => {
    feedUtterance(text);
    notifySpeaking(text);
    speak(text, characterId, lang, hints);
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

  // idle chatter: if the user is quiet too long, she speaks up
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
    stopSpeaking();
    let answered = false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, persona }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { reply?: string; emotionHints?: Record<string, number> };
      if (data.emotionHints) applyLlmHints(data.emotionHints);
      const reply = data.reply || '…';
      feedUtterance(reply);
      notifySpeaking(reply);
      speak(reply, characterId, lang, data.emotionHints);
      setHistory((h) => [...h, { role: 'assistant', content: reply }]);
      answered = true;
    } catch {
      // no server (e.g. static GitHub Pages build) — free keyless LLM from the browser
      try {
        const r = await clientChat([...history, { role: 'user', content: text }], { language: lang, persona });
        applyLlmHints(r.emotionHints);
        feedUtterance(r.reply);
        notifySpeaking(r.reply);
        speak(r.reply, characterId, lang, r.emotionHints);
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

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  };

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-2 px-3 pb-3" style={{ height: '19rem' }}>
      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto rounded-3xl border border-white/10 bg-black/30 p-4 text-sm backdrop-blur-md"
      >
        {history.length === 0 && <p className="text-white/40">{t(lang, 'sayHi', { name: characterName })}</p>}
        {history.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <p
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2 text-white'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-3.5 py-2 text-white/95'
              }
              style={m.role === 'user' ? { backgroundColor: accent } : undefined}
            >
              {m.content}
            </p>
          </div>
        ))}
        {busy && <p className="text-white/40">{t(lang, 'typing', { name: characterName })}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={tutor}
          title="?"
          className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-black/30 text-white/70 backdrop-blur-md hover:bg-black/50"
        >
          ?
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={t(lang, 'sayHi', { name: characterName })}
          className="h-10 flex-1 rounded-full border border-white/10 bg-black/30 px-4 text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-white/40"
        />
        <button
          onClick={toggleVoice}
          title={voiceOn ? 'voice on' : 'voice off'}
          className={`h-10 w-10 shrink-0 rounded-full border border-white/10 backdrop-blur-md ${voiceOn ? 'text-white' : 'text-white/35'} hover:bg-black/50`}
          style={voiceOn ? { backgroundColor: `${accent}55` } : { backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          {voiceOn ? '🔊' : '🔇'}
        </button>
        <button
          onClick={() => void send()}
          disabled={busy}
          className="h-10 shrink-0 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
