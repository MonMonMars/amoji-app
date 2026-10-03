'use client';
// Chat room panel — boxless fading history, hero mic with the emotion orb.
// r2026-10-03.13: ChatGPT-style voice mode (mic stays open, real-speech
// barge-in, typing still live), a clean white mic icon when idle, and
// giggle + whole-body laugh reactions whenever something's funny.
// r2026-10-03.17: the daily check-in wears the mood of whatever she recalls —
// a happy "a week ago today…" lands on a smiling face, a sad one softens it.
// r2026-10-03.18: mid-conversation she reacts to how the USER feels the
// instant they say it — "I'm so tired" softens her face and orb before her
// reply is even generated; the felt mood stays as a floor under the LLM's
// reply hints (typed path and voice path both funnel through send()).
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints, triggerLaugh } from '../lib/companion';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking, isSpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { pickOuch } from '../lib/ouch';
import { pickLaugh, LAUGH_RE } from '../lib/laugh';
import { pickThinkPhrase } from '../lib/think-phrases';
import { clientChat } from '../lib/client-chat';
import { speak, stopSpeaking, speakThinkingFiller } from '../lib/voice';
import { buildDailyGreeting, buildMemoryBlock, detectMood, greetingHints, memorySummaryCount, moodToHints, recordVisit, rememberExchange } from '../lib/memory';
import { listenContinuous, listenSupported } from '../lib/listen';
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
/** gap between thinking-out-loud phases while the LLM is still generating */
const THINK_PHASE_MS = 4_500;

export default function ChatPanel({
  characterName = 'Jun',
  characterId = 'jun',
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
  const micModeRef = useRef(false);
  const micStopRef = useRef<(() => void) | null>(null);
  const laughCountRef = useRef(0);
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
  // never leave the mic running if the panel unmounts
  useEffect(() => () => { micStopRef.current?.(); }, []);
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

  const sayLocal = (
    text: string,
    hints?: Record<string, number>,
    lead?: { text: string; pitch: number; rate: number },
  ) => {
    feedUtterance(text);
    notifySpeaking(lead ? `${lead.text} ${text}` : text);
    speak(text, characterId, lang, hints, lead);
    if (hints) applyLlmHints(hints);
    setHistory((h) => [...h, { role: 'assistant', content: text }]);
  };

  // speak a just-arrived reply; if the exchange was funny, giggle first and
  // let the 3D body laugh along (squash-bounce overlay in CompanionCanvas)
  const speakReply = (userText: string, reply: string, hints?: Record<string, number>) => {
    const funny = LAUGH_RE.test(userText) || LAUGH_RE.test(reply);
    if (!funny) {
      notifySpeaking(reply);
      speak(reply, characterId, lang, hints);
      return;
    }
    triggerLaugh();
    applyLlmHints({ joy: 0.9 });
    const giggle = pickLaugh(characterId, lang, laughCountRef.current++);
    notifySpeaking(`${giggle} ${reply}`);
    speak(reply, characterId, lang, { ...(hints ?? {}), joy: 0.9 }, { text: giggle, pitch: 0.28, rate: 0.22 });
  };

  // startup: first a welcome line; if it's a NEW day, the second line is her
  // daily check-in (time-of-day hello + streak + follow-up on yesterday's mood
  // or the week-ago diary line). Whatever she recalls, she WEARS that feeling
  // while saying it — face, mic orb and voice all take the recalled mood.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const visit = recordVisit();
    const daily = visit.isNewDay ? buildDailyGreeting(lang, visit) : undefined;
    const t1 = setTimeout(() => sayLocal(pickLine('startup', lang, 0)), 1200);
    const t2 = setTimeout(
      () => sayLocal(daily ?? pickLine('startup', lang, 1), daily ? greetingHints(visit) : undefined),
      5200,
    );
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // poke replies — instant ouch cry (as the vocal lead) + personality line
  const lastPokeRef = useRef(pokeCount);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    const ouch = pickOuch(characterId, lang, pokeCount);
    sayLocal(pickPokeLine(characterId, lang, pokeCount), { surprise: 0.8, joy: 0.4 }, { text: ouch, pitch: 0.3, rate: 0.15 });
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
    // felt-mood reaction: she reacts to how YOU feel the instant you say it —
    // "I'm so tired" softens her face and the mic orb before her reply even
    // starts generating, and the felt mood stays as a floor under whatever
    // hints her reply later layers on top
    const feltHints = moodToHints(detectMood(text));
    if (feltHints) applyLlmHints(feltHints);
    // "hmm…" thinking moment while the reply generates (reply speech cuts it off)
    speakThinkingFiller(characterId, lang);
    // thinking-out-loud phases — while the LLM is slow she keeps musing in her
    // own voice (um…… → let me think… → let me search the internet… please
    // wait → uuuuummmm), each new phase replacing the previous one
    let thinkPhase = 0;
    const thinkTimer = setInterval(() => {
      const phrase = pickThinkPhrase(characterId, lang, thinkPhase++);
      notifySpeaking(phrase);
      speak(phrase, characterId, lang, { confusion: 0.4, neutral: 0.3 });
    }, THINK_PHASE_MS);
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
      // the felt mood is a FLOOR: her reply's hints win on conflicts, but the
      // feeling the user just expressed never fully drops out
      const replyHints = feltHints ? { ...feltHints, ...(data.emotionHints ?? {}) } : data.emotionHints;
      if (replyHints) applyLlmHints(replyHints);
      const reply = data.reply || '…';
      feedUtterance(reply);
      speakReply(text, reply, replyHints);
      setHistory((h) => [...h, { role: 'assistant', content: reply }]);
      answered = true;
    } catch {
      // no server (e.g. static GitHub Pages build) — free keyless LLM from the browser
      try {
        // stream the reply live into a placeholder bubble — first tokens show
        // up immediately instead of after the whole generation finishes
        setHistory((h) => [...h, { role: 'assistant', content: '…' }]);
        const r = await clientChat([...history, { role: 'user', content: text }], {
          language: lang,
          persona,
          memory,
          onPartial: (partial) => {
            // hide a half-typed [emotion:{...}] tag so it never flashes on screen
            const clean = partial
              .replace(/\[emotion:[^\]]*$/, '')
              .replace(/\[emotion:\{[^}]*\}\]/, '');
            setHistory((h) => {
              const last = h.length - 1;
              const tail = h[last];
              if (!tail || tail.role !== 'assistant') return h;
              return [...h.slice(0, last), { ...tail, content: clean || '…' }];
            });
          },
        });
        // same floor logic on the streaming path
        const replyHints = feltHints ? { ...feltHints, ...r.emotionHints } : r.emotionHints;
        applyLlmHints(replyHints);
        feedUtterance(r.reply);
        speakReply(text, r.reply, replyHints);
        setHistory((h) => [...h.slice(0, -1), { role: 'assistant', content: r.reply }]);
        answered = true;
      } catch {
        // drop the placeholder only if nothing ever streamed; partial text stays
        setHistory((h) => {
          const tail = h[h.length - 1];
          return tail && tail.role === 'assistant' && tail.content === '…' ? h.slice(0, -1) : h;
        });
      }
    } finally {
      clearInterval(thinkTimer); // reply (or failure) is here — stop the musing
      if (!answered) setHistory((h) => [...h, { role: 'assistant', content: '… (connection hiccup — I’m still here)' }]);
      setBusy(false);
      busyRef.current = false;
      lastActivityRef.current = Date.now();
    }
  };

  // ChatGPT-style hero mic — one button does everything:
  // tap → voice mode ON: the mic stays open and keeps listening; the moment
  // REAL talking is detected (the recognizer only fires on actual speech, so
  // background noise is ignored) her voice is cut instantly. Typing stays
  // live the whole time. tap again → voice mode OFF.
  const mic = () => {
    if (micModeRef.current) {
      micModeRef.current = false;
      micStopRef.current?.();
      micStopRef.current = null;
      listeningRef.current = false;
      setListening(false);
      lastActivityRef.current = Date.now();
      return;
    }
    if (!listenSupported()) {
      window.alert(lang === 'yue'
        ? '你嘅瀏覽器唔支援語音輸入，請用最新版 Chrome 或者 Safari 再試。'
        : 'Speech input is not supported in this browser — try the latest Chrome or Safari.');
      return;
    }
    micModeRef.current = true;
    listeningRef.current = true;
    setListening(true);
    stopSpeaking(); // interrupt her mid-sentence, exactly like ChatGPT voice
    let bargeInArmed = true; // first real speech of a burst cuts her off
    micStopRef.current = listenContinuous(lang, {
      onSpeechStart: () => {
        if (!bargeInArmed) return;
        bargeInArmed = false;
        stopSpeaking(); // the user is really talking — cut her voice NOW
      },
      onFinal: (said) => {
        bargeInArmed = true;
        lastActivityRef.current = Date.now();
        // never lose a spoken message: if she's still generating, queue it in
        // the input box; otherwise answer right away
        if (busyRef.current) setInput((v) => (v ? `${v} ${said}` : said));
        else void send(said);
      },
      onEnd: () => {
        // mic error / permission denied — drop out of voice mode
        micModeRef.current = false;
        micStopRef.current = null;
        listeningRef.current = false;
        setListening(false);
      },
    });
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
        className="w-full space-y-2.5 overflow-y-auto px-2 pb-1 pt-6 text-[15px] leading-relaxed [mask-image:linear-gradient(to_bottom,transparent,black_16%)]"
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

      {/* input row — ChatGPT-style hero mic with the living emotion orb */}
      <div className="flex w-full items-center gap-2.5">
        <button
          onClick={() => mic()}
          title={t(lang, 'micTitle')}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-black/50 backdrop-blur-md transition hover:bg-black/70 active:scale-95"
          style={
            listening
              ? {
                  borderColor: 'rgba(96,175,255,0.95)',
                  boxShadow: '0 0 26px -2px rgba(88,166,255,0.8), 0 0 64px -12px rgba(88,166,255,0.55)',
                }
              : { borderColor: speakingNow ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)' }
          }
        >
          {speakingNow && !listening && (
            <span
              className="pointer-events-none absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-transparent"
              style={{ borderTopColor: `${accent}d0`, borderRightColor: `${accent}60` }}
            />
          )}
          {/* idle = a clean white mic icon only; live = the soft emotion orb */}
          {(listening || speakingNow) && <EmotionOrb size={52} accent={accent} listening={listening} />}
          {!listening && !speakingNow && (
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none h-6 w-6 text-white"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 15.2a3.7 3.7 0 0 0 3.7-3.7V6.6a3.7 3.7 0 1 0-7.4 0v4.9a3.7 3.7 0 0 0 3.7 3.7Z"
                fill="currentColor"
              />
              <path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M12 18v3.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
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
