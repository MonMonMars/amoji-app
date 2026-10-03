'use client';
// Chat room panel — boxless fading history, hero mic with the emotion orb.
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints } from '../lib/companion';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking, isSpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { clientChat } from '../lib/client-chat';
import { speak, stopSpeaking } from '../lib/voice';
import { buildDailyGreeting, buildMemoryBlock, memorySummaryCount, recordVisit, rememberExchange } from '../lib/memory';
import { listenOnce, listenSupported } from '../lib/listen';
import { t, type Lang } from '../lib/prefs';
import type { ChatStatus } from '../lib/status';
import EmotionOrb from './EmotionOrb';

interface Msg { role: 'user' | 'assistant'; content: string }

export interface ChatPanelProps {
  characterName?: string;
  characterId?: string;
  lang?: Lang;
  accent?: string;
  persona?: string;
  /** increments when the user pokes the character — triggers a poke reply */
  pokeCount?: number;
  onStatus?: (s: ChatStatus) => void;
  onMemCount?: (n: number) => void;
}

const IDLE_AFTER_MS = 40_000;

export default function ChatPanel({
  characterName = 'Juno',
  characterId = 'juno',
  lang = 'yue',
  accent = '#f9a8d4',
  persona,
  pokeCount = 0,
  onStatus,
  onMemCount,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const busyRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const idleCounterRef = useRef(0);
  const greetedRef = useRef(false);
  const listeningRef = useRef(false);
  const recStopRef = useRef<(() => void) | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const onMemCountRef = useRef(onMemCount);
  onMemCountRef.current = onMemCount;

  useEffect(() => {
    setHistory(loadHistory());
  }, []);
  // settings sheet can wipe the conversation from one central place
  useEffect(() => {
    const clear = () => setHistory([]);
    window.addEventListener('amoji:clear-history', clear);
    return () => window.removeEventListener('amoji:clear-history', clear);
  }, []);
  useEffect(() => {
    if (nearBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
    saveHistory(history);
  }, [history]);

  // live status for the top-left plate + speaking flag for the mic orb
  useEffect(() => {
    const id = setInterval(() => {
      const speaking = isSpeaking();
      setSpeakingNow(speaking);
      onStatusRef.current?.(
        listeningRef.current ? 'listening' : busyRef.current ? 'thinking' : speaking ? 'speaking' : 'idle',
      );
    }, 250);
    return () => clearInterval(id);
  }, []);

  const sayLocal = (text: string, hints?: Record<string, number>) => {
    feedUtterance(text);
    notifySpeaking(text);
    speak(text, characterId, lang, hints);
    if (hints) applyLlmHints(hints);
    setHistory((h) => [...h, { role: 'assistant', content: text }]);
  };

  // startup: first a welcome line; if it's a NEW day, the second line is her
  // daily check-in (time-of-day hello + streak + follow-up on yesterday's mood)
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const visit = recordVisit();
    const daily = visit.isNewDay ? buildDailyGreeting(lang, visit) : undefined;
    const t1 = setTimeout(() => sayLocal(pickLine('startup', lang, 0)), 1200);
    const t2 = setTimeout(() => sayLocal(daily ?? pickLine('startup', lang, 1)), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // poke replies — personality-specific reaction line + face flavor
  const lastPokeRef = useRef(pokeCount);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    sayLocal(pickPokeLine(characterId, lang, pokeCount), { surprise: 0.8, joy: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCount]);

  // idle chatter: if the user is quiet too long, she speaks up in her own voice
  useEffect(() => {
    const timer = setInterval(() => {
      if (busyRef.current) return;
      if (Date.now() - lastActivityRef.current < IDLE_AFTER_MS) return;
      lastActivityRef.current = Date.now();
      sayLocal(pickIdleLine(characterId, lang, idleCounterRef.current++));
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    busyRef.current = true;
    lastActivityRef.current = Date.now();
    nearBottomRef.current = true;
    setHistory((h) => [...h, { role: 'user', content: text }]);
    feedUtterance(text);
    stopSpeaking();
    // learn from the user's words, then inject what she remembers into her prompt
    onMemCountRef.current?.(memorySummaryCount(rememberExchange(text)));
    const memory = buildMemoryBlock(lang);
    let answered = false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, persona, memory }),
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
        const r = await clientChat([...history, { role: 'user', content: text }], { language: lang, persona, memory });
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

  // tap the orb to talk — the mic is the hero (ChatGPT-style); tap again to stop
  const mic = async () => {
    if (listeningRef.current) {
      recStopRef.current?.();
      return;
    }
    if (!listenSupported()) {
      window.alert(lang === 'yue'
        ? '你嘅瀏覽器暫時唔支援語音輸入，試下用 Chrome 或者 Safari 最新版。'
        : 'Speech input is not supported in this browser — try the latest Chrome or Safari.');
      return;
    }
    listeningRef.current = true;
    setListening(true);
    stopSpeaking();
    try {
      const text = await listenOnce(lang, { onStart: (rec) => { recStopRef.current = rec.stop; } });
      if (text) await send(text);
    } catch { /* no speech or error — stay quiet */ }
    finally {
      listeningRef.current = false;
      recStopRef.current = null;
      setListening(false);
      lastActivityRef.current = Date.now();
    }
  };

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-1.5 px-4 pb-4">
      {/* boxless history — newer lines opaque, older ones melt away; scrollable */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="w-full space-y-2.5 overflow-y-auto px-2 pb-1 pt-6 text-[15px] leading-relaxed [mask-image:linear-gradient(to_bottom,transparent,black_16%))]"
        style={{ maxHeight: '34vh' }}
      >
        {history.length === 0 && <p className="text-center text-white/40">{t(lang, 'sayHi', { name: characterName })}</p>}
        {history.map((m, i) => {
          const age = history.length - 1 - i;
          const opacity = Math.max(0.15, 1 - age * 0.14);
          const isUser = m.role === 'user';
          return (
            <div key={i} className={isUser ? 'text-right' : 'text-left'} style={{ opacity }}>
              {!isUser && i === history.length - 1 && (
                <p className="mb-0.5 pl-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: `${accent}b0` }}>
                  {characterName}
                </p>
              )}
              <p className={isUser ? '' : 'text-white/95'} style={isUser ? { color: accent } : undefined}>
                {m.content}
              </p>
            </div>
          );
        })}
        {busy && <p className="text-white/40">{t(lang, 'typing', { name: characterName })}</p>}
      </div>

      {/* input row — mic orb is the hero */}
      <div className="flex w-full items-center gap-2.5">
        <button
          onClick={() => void mic()}
          title={t(lang, 'micTitle')}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md transition hover:bg-black/60"
          style={listening ? { borderColor: `${accent}aa`, boxShadow: `0 0 24px -4px ${accent}` } : undefined}
        >
          <EmotionOrb size={46} accent={accent} listening={listening} />
          {!listening && !speakingNow && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
              🎙️
            </span>
          )}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={t(lang, 'sayHi', { name: characterName })}
          className="h-11 flex-1 rounded-full border border-white/10 bg-black/30 px-4 text-[15px] text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-white/40"
        />
        <button
          onClick={() => void send()}
          disabled={busy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition disabled:opacity-40"
          style={{ backgroundColor: accent }}
          aria-label="send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
