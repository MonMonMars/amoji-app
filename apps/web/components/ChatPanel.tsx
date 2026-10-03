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
// r2026-10-03.20: amplified feelings land harder — 超開心 / 勁攰 / very tired
// / とても嬉しい scale the reaction strength; plain moods stay gentle.
// r2026-10-03.21: amplified feelings now lift her VOICE too — 超開心 rings
// brighter and quicker, 勁攰 slower and softer; plain moods unchanged.
// r2026-10-03.24: the felt mood now tints her VOICE while she waits — the
// first "hmm…", every thinking-out-loud phase, and idle chatter all wear the
// user's last felt mood (sad → softer 嗯……我喺度諗, happy → livelier,
// angry → de-escalating); the face/orb already wore it — now the waiting does.
// r2026-10-03.25: her LAUGH wears it too — a joke after "I'm so tired" gets
// a soft slow chuckle and a gentle joy, not a full burst; an angry mood gets
// a wry chuckle that defuses, a sad one a warm "thanks, I needed that".
// r2026-10-03.26: her POKE reaction wears it too — poking her while you're
// sad gets a gentle, almost apologetic gasp and a low-surprise flinch (not
// a full startle); a tired one a soft "oh…"; an angry one a wry "hey—";
// no felt mood keeps the classic personality cry and the old voice numbers.
// r2026-10-03.27: if her LLM brain runs out of credit mid-session, client-chat
// parks it and fires 'amoji:brain-degraded' — we surface one small note in the
// history so the switch to the free lane is explained, not mysterious.
// r2026-10-03.29: the hero mic is now ONLY a circle — no hard border, no
// square edge. Soft circular glow (inset rings follow the border-radius),
// bigger 80px button, 72px orb drawn inside its own safe margin.
// r2026-10-03.30: long-term memory v4 — every completed turn is stored as
// the conversation thread (last user words + her reply), so the next session
// opens with "last time we were talking about…" and her prompt always
// carries the open topic.
// r2026-10-03.38: staged re-engagement — when the USER (not just the room)
// goes quiet, she leans in over time: her usual idle chatter from 40s, direct
// "you've gone quiet" follow-ups from ~2 min, and a soft closer at ~5 min
// said ONCE — then she waits instead of nagging. Any real user action
// (message, poke, spoken word, even tapping the mic off) resets the curve.
// r2026-10-03.39: activity dialogue sets her body off — "sing for me",
// "跳一下", "kung fu!", "太極", "play the piano", "跑步" each trigger a
// choreographed movement-library performance while her reply plays.
// r2026-10-03.40: she actually SINGS — a sing trigger now rides a real
// melodic contour (one note per clause): she sings the lyric-like reply
// itself, or a little ditty from the per-language song bank, while the r.39
// sing performance plays on for the whole song.
// r2026-10-04.42: together-modes — she plays mini-games (RPS / guess-the-
// number / dice, LLM-free so they're instant and fair), sings a call-and-
// response DUET with you (you take a line, she takes a line, last line
// together), and shares a MEAL (your "eat with me" gets a toast as the vocal
// lead of her reply). "Quit" ends a running game or duet gracefully.
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints, triggerLaugh, triggerMove } from '../lib/companion';
import { detectMove } from '../lib/moves';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking, isSpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { pickMoodIdleLine } from '../lib/mood-chatter';
import { pickOuch, ouchStyleFor } from '../lib/ouch';
import { pickLaugh, laughStyleFor, LAUGH_RE } from '../lib/laugh';
import { pickThinkPhrase } from '../lib/think-phrases';
import { clientChat } from '../lib/client-chat';
import { speak, stopSpeaking, speakThinkingFiller, sing } from '../lib/voice';
import { pickSong, pickDuet } from '../lib/songs';
import { detectGame, startGame, playTurn, gameFarewellLine, type GameState } from '../lib/games';
import { DUET_TRIGGER, QUIT_RE, MEAL_TOGETHER_TRIGGER, duetInviteLine, duetGoodbyeLine, pickMealToast } from '../lib/activities';
import { buildDailyGreeting, buildMemoryBlock, feltMood, greetingHints, memorySummaryCount, moodToHints, recordVisit, rememberExchange, rememberTurn } from '../lib/memory';
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
  onMemCount?: (n: number) => number | void;
}

const IDLE_AFTER_MS = 40_000;
/** gap between thinking-out-loud phases while the LLM is still generating */
const THINK_PHASE_MS = 4_500;
/** user silence beyond this switches idle chatter to direct re-engagement */
const REENGAGE_AFTER_MS = 110_000;
/** user silence beyond this gets the soft closer — once, then she waits */
const CLOSER_AFTER_MS = 300_000;

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
  const lastUserRef = useRef(Date.now());
  const lastChatterAtRef = useRef(0);
  const chatterCountRef = useRef(0);
  const reengageStageRef = useRef(0);
  const greetedRef = useRef(false);
  const listeningRef = useRef(false);
  const micModeRef = useRef(false);
  const micStopRef = useRef<(() => void) | null>(null);
  const laughCountRef = useRef(0);
  // r.42 — together-mode state: a running mini-game, or a running duet
  const gameRef = useRef<GameState | null>(null);
  const duetRef = useRef<{ lines: string[]; idx: number } | null>(null);
  const lastFeltRef = useRef<string | undefined>(undefined);
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
  // r.27 — when her LLM brain is parked for running out of credit, client-chat
  // fires this once; add the explanation line to the history (text-only)
  useEffect(() => {
    const note = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text !== 'string' || !text) return;
      setHistory((h) => [...h, { role: 'assistant', content: text }]);
    };
    window.addEventListener('amoji:brain-degraded', note);
    return () => window.removeEventListener('amoji:brain-degraded', note);
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
  // let the 3D body laugh along (squash-bounce overlay in CompanionCanvas).
  // r.25: the laugh itself wears the felt mood — a tired/sad user gets a
  // soft, slow, sympathetic chuckle and a gentler joy lift; an angry one a
  // wry defusing chuckle; neutral keeps the full personality burst.
  // r.39: activity dialogue also sets her body off — singing, jumping, kung
  // fu, tai chi, piano, jogging each trigger a choreographed performance
  // (movement library) while the reply plays, from YOUR words or her own.
  // r.40: a sing trigger goes further — she delivers the line AS A SONG on
  // the melodic contour (lyric-like replies ride as-is; longer ones become a
  // ditty from the song bank) and the history shows exactly what she sang.
  // r.42: a shared meal gets a toast — "eat with me" raises a little cheer
  // as the vocal lead of her reply (乾杯！/ Cheers!), like a dinner date.
  const speakReply = (userText: string, reply: string, hints?: Record<string, number>, intensity = 1, mood?: string): string => {
    const mv = detectMove(userText) ?? detectMove(reply);
    // r.40 — she really sings: a short lyric-like reply rides the melody as-is;
    // a longer one becomes a little ditty from the per-language song bank.
    if (mv === 'sing') {
      triggerMove('sing');
      applyLlmHints({ joy: 0.85 });
      const compact = reply.replace(/\s/g, '');
      const song = compact.length > 0 && compact.length <= 48
        ? reply
        : pickSong(lang, laughCountRef.current).join(' ');
      notifySpeaking(song);
      sing(song, characterId, lang);
      return song;
    }
    if (mv) triggerMove(mv);
    const funny = LAUGH_RE.test(userText) || LAUGH_RE.test(reply);
    if (!funny) {
      // r.42 — dinner together: raise a toast as the vocal lead of her reply
      const meal = !!userText && MEAL_TOGETHER_TRIGGER.test(userText);
      notifySpeaking(reply);
      speak(
        reply,
        characterId,
        lang,
        hints,
        meal ? { text: pickMealToast(lang, laughCountRef.current), pitch: 0.12, rate: 0 } : undefined,
        intensity,
      );
      return reply;
    }
    const style = laughStyleFor(mood);
    triggerLaugh();
    applyLlmHints({ joy: style.joy });
    const giggle = pickLaugh(characterId, lang, laughCountRef.current++, mood);
    notifySpeaking(`${giggle} ${reply}`);
    speak(reply, characterId, lang, { ...(hints ?? {}), joy: style.joy }, { text: giggle, pitch: style.pitch, rate: style.rate }, intensity);
    return reply;
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

  // poke replies — instant ouch cry (as the vocal lead) + personality line.
  // r.26: the cry and the flinch wear the last felt mood — poking her while
  // you're sad gets a gentle apologetic gasp and a soft low flinch instead of
  // a full startle; no felt mood keeps the classic cry and voice numbers.
  const lastPokeRef = useRef(pokeCount);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    const ouchMood = lastFeltRef.current;
    const style = ouchStyleFor(ouchMood);
    const ouch = pickOuch(characterId, lang, pokeCount, ouchMood);
    sayLocal(pickPokeLine(characterId, lang, pokeCount), { surprise: style.surprise, joy: style.joy }, { text: ouch, pitch: style.pitch, rate: style.rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCount]);

  // idle chatter + staged re-engagement (r.38): she never lets a quiet room
  // die. Measured from the USER's last real action (message, poke, spoken
  // word, mic tap) — her own lines don't restart the clock. Stage 0 (<2 min
  // of user silence) = her usual persona/mood idle lines; stage 1 (2 min+) =
  // direct "you've gone quiet" follow-ups that lean in harder; stage 2
  // (5 min+) = one soft closer ("I'll be right here") and then she simply
  // waits instead of nagging. Her lines never pile onto her own voice.
  useEffect(() => {
    const timer = setInterval(() => {
      if (busyRef.current || isSpeaking()) return;
      if (reengageStageRef.current >= 2) return; // closer said — she's waiting
      const silent = Date.now() - lastUserRef.current;
      if (silent < IDLE_AFTER_MS) return;
      if (Date.now() - lastChatterAtRef.current < IDLE_AFTER_MS) return;
      lastChatterAtRef.current = Date.now();
      // r.24 — idle chatter wears the last felt mood: after "I'm so tired"
      // her quiet moments turn soft ("borrow some of my energy") instead of
      // the default chirp; falls back to the persona bank when neutral.
      const idleMood = lastFeltRef.current;
      const feltHints = idleMood ? moodToHints(idleMood) : undefined;
      const n = chatterCountRef.current++;
      if (silent >= CLOSER_AFTER_MS) {
        reengageStageRef.current = 2;
        sayLocal(pickLine('reengageSoft', lang, n), feltHints);
        return;
      }
      if (silent >= REENGAGE_AFTER_MS) {
        reengageStageRef.current = 1;
        sayLocal(pickLine('reengage', lang, n), feltHints);
        return;
      }
      const line = (idleMood ? pickMoodIdleLine(idleMood, lang, n) : undefined) ?? pickIdleLine(characterId, lang, n);
      sayLocal(line, feltHints);
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
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    nearBottomRef.current = true;
    setHistory((h) => [...h, { role: 'user', content: text }]);
    feedUtterance(text);
    stopSpeaking();
    // r.42 — together-modes intercept the turn BEFORE any LLM work: quitting
    // a running game/duet, advancing a running game, taking the next duet
    // line, starting a new game, or starting a duet. All of these answer
    // instantly in her own voice — no thinking filler, no brain needed.
    const done = () => {
      setBusy(false);
      busyRef.current = false;
      lastActivityRef.current = Date.now();
    };
    if (QUIT_RE.test(text) && (gameRef.current || duetRef.current)) {
      const line = gameRef.current ? gameFarewellLine(lang) : duetGoodbyeLine(lang);
      gameRef.current = null;
      duetRef.current = null;
      sayLocal(line);
      done();
      return;
    }
    if (gameRef.current) {
      const res = playTurn(gameRef.current, text, lang);
      gameRef.current = res.ended ? null : res.state;
      if (res.move) triggerMove(res.move);
      sayLocal(res.line);
      done();
      return;
    }
    if (duetRef.current) {
      const d = duetRef.current;
      const line = d.lines[d.idx]!;
      sing(line, characterId, lang);
      notifySpeaking(line);
      feedUtterance(line);
      triggerMove('sing');
      setHistory((h) => [...h, { role: 'assistant', content: line }]);
      d.idx += 1;
      if (d.idx >= d.lines.length) duetRef.current = null;
      done();
      return;
    }
    {
      const g = detectGame(text);
      if (g && g !== 'stop') {
        const { line, state } = startGame(g, lang);
        gameRef.current = state;
        sayLocal(line);
        done();
        return;
      }
    }
    if (DUET_TRIGGER.test(text)) {
      duetRef.current = { lines: pickDuet(lang, laughCountRef.current), idx: 0 };
      triggerMove('sing');
      sayLocal(duetInviteLine(lang));
      done();
      return;
    }
    // felt-mood reaction: she reacts to how YOU feel the instant you say it —
    // "I'm so tired" softens her face and the mic orb before her reply even
    // starts generating, and the felt mood stays as a floor under whatever
    // hints her reply later layers on top. Amplifiers (超開心 / 勁攰 / very
    // tired / とても嬉しい) scale how strongly she wears it — plain moods stay
    // gentle.
    const felt = feltMood(text);
    lastFeltRef.current = felt?.mood;
    const feltHints = moodToHints(felt?.mood, felt?.intensity);
    if (feltHints) applyLlmHints(feltHints);
    // "hmm…" thinking moment while the reply generates — mood-tinted (r.24):
    // a sad user's first hmm is softer than a happy one's (reply speech cuts it off)
    speakThinkingFiller(characterId, lang, felt?.mood);
    // thinking-out-loud phases — while the LLM is slow she keeps musing in her
    // own voice, each new phase replacing the previous one; the sequence wears
    // the felt mood too (r.24), and felt hints/intensity shape her prosody
    let thinkPhase = 0;
    const thinkTimer = setInterval(() => {
      const phrase = pickThinkPhrase(characterId, lang, thinkPhase++, felt?.mood);
      notifySpeaking(phrase);
      speak(phrase, characterId, lang, feltHints ?? { confusion: 0.4, neutral: 0.3 }, undefined, felt?.intensity);
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
      // r.30 — remember the completed turn (your words + her reply) so the
      // next session can pick the conversation thread back up
      rememberTurn(text, reply);
      onMemCountRef.current?.(memorySummaryCount());
      feedUtterance(reply);
      const spoken = speakReply(text, reply, replyHints, felt?.intensity, felt?.mood);
      setHistory((h) => [...h, { role: 'assistant', content: spoken }]);
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
        // same floor logic on the streaming path (.18b: guarded — replyHints
        // can be undefined when the exchange carried no mood at all)
        const replyHints = feltHints ? { ...feltHints, ...r.emotionHints } : r.emotionHints;
        if (replyHints) applyLlmHints(replyHints);
        // r.30 — the streaming path remembers the turn too (both paths learn)
        rememberTurn(text, r.reply);
        onMemCountRef.current?.(memorySummaryCount());
        feedUtterance(r.reply);
        const spoken = speakReply(text, r.reply, replyHints, felt?.intensity, felt?.mood);
        setHistory((h) => [...h.slice(0, -1), { role: 'assistant', content: spoken }]);
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
      lastUserRef.current = Date.now();
      reengageStageRef.current = 0;
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
        lastUserRef.current = Date.now();
        reengageStageRef.current = 0;
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
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition active:scale-95"
          style={
            listening
              ? {
                  // voice mode ON — ChatGPT-blue glow, no border line
                  boxShadow: '0 0 30px -2px rgba(88,166,255,0.85), 0 0 70px -14px rgba(88,166,255,0.5)',
                }
              : speakingNow
                ? {
                    // she is speaking — soft accent halo, no border line
                    boxShadow: `0 0 26px -4px ${accent}99, inset 0 0 0 1px rgba(255,255,255,0.14)`,
                  }
                : {
                    // idle — a faint circular ring only (inset shadows follow
                    // the border-radius, so this is a circle, never a square)
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 6px 24px -10px rgba(0,0,0,0.7)',
                  }
          }
        >
          {speakingNow && !listening && (
            <span
              className="pointer-events-none absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-transparent"
              style={{ borderTopColor: `${accent}d0`, borderRightColor: `${accent}60` }}
            />
          )}
          {/* idle = a clean white mic icon only; live = the soft emotion orb */}
          {(listening || speakingNow) && <EmotionOrb size={72} accent={accent} listening={listening} />}
          {!listening && !speakingNow && (
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none h-7 w-7 text-white"
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
