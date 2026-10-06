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
// sad gets a gentle apologetic gasp and a low-surprise flinch (not
// a full startle); a tired one a soft "oh…"; an angry one a wry "hey—";
// no felt mood keeps the classic personality cry and the old voice numbers.
// r2026-10-03.27: if her LLM brain runs out of credit mid-session, client-chat
// parks it and fires 'amoji:brain-degraded' — we surface one small note in
// the history so the switch to the free lane is explained, not mysterious.
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
// r2026-10-04.45: trainer lessons (Wii Fit-style, researched from the 2007
// original) — "做瑜伽" / "打太極" / "教我功夫" / "熱身" start a step-by-step
// follow-along routine: she demos each move from the movement library and
// cues breathing/counts, one step per message, LLM-free even when the brain
// is slow; "quit" bows out gracefully with a per-routine farewell.
// r2026-10-04.47: warm-up dialogue — while her reply generates, ONE transient
// placeholder bubble carries the wait: preloaded warm lines (praise, curiosity,
// encouragement, in her own language, mood-tinted) play in it every few
// seconds and are spoken aloud, so the load time reads as her reacting to
// you, not a pause; the first stream token takes the bubble over and the real
// reply commits in its place. Replaces the old thinking-out-loud interval.
// r2026-10-04.48: performance theatre — (a) every few turns, a slow brain
// becomes a SHOW: she dances to an original WebAudio theme composed for her
// personality while the reply generates; (b) in quiet moments she offers
// a private performance ("I just learned a new dance — want to see?") and
// remembers the offer until you answer — YES starts the show instantly
// (her signature song sung live, or a full dance number); (c) every few idle
// lines she teaches you something she can do (games, lessons, duets, meals,
// voice mode, memory). Music always fades out the moment her real reply lands.
// r2026-10-04.61: the history fade is POSITION-based, not age-based (Master
// Simon: scrolled-up old lines must stay readable). Every message renders
// fully opaque; a mask on the panel fades by on-screen HEIGHT only — the
// bottom line is 100%, each line higher a step dimmer, the top melts away.
// Scrolling an old message down into the bright zone makes it crisp again.
// r2026-10-04.84: the mic frost went SQUARE on iOS — WebKit renders
// backdrop-filter over the FULL rectangular border-box no matter the
// border-radius (r62's overflow:hidden cured some iOS versions, not all).
// The blur is gone from the button entirely: a slightly deeper solid
// bg-black/55 keeps the same readability with zero backdrop-filter, so
// there is physically no rectangle left to see.
// r2026-10-04.70: ADAPTIVE DIALOGUE — her words now fit the world: (a) idle
// chatter first tries a line belonging to the current backdrop (new lib/
// adaptive.ts), so sitting under the aurora sounds different from a rainy
// night; (b) her system prompt gains a block naming the scene + calibrating
// warmth from the pairing — opposite-sex gets gentle affection, same-gender
// gets best-mate banter, kid mode stays friendship-only, and "secret" (the
// default) adds nothing at all, so users who never pick keep the old voice.
// r2026-10-04.70b: typecheck fix — userGender state admits `undefined`
// (loadProfile().gender is optional; never-set profiles stay 'secret'-free).
// r2026-10-04.81: voice mode speaks onto the screen — the half-heard words
// stream into a live italic user bubble the moment they're recognized, and
// the utterance auto-sends ~1.1s after you stop talking (endpointing lives
// in lib/listen.ts), exactly like ChatGPT/Grok voice mode.
// r2026-10-04.82: the world gains a voice — the ambient bed for the current
// backdrop (rain + distant thunder, campfire crackle, wind + birdsong…)
// runs for as long as the chat lives (lib/sfx.ts), and poking her now lands
// with a soft boing alongside the ouch.
// r2026-10-04.86: her performances now carry real music to the END — the
// sung reply, the call-and-response duet and the piano move run on the
// performance layer (startPerformanceMusic), whose preserve flag keeps the
// chat pipeline's generic stopMusic() cleanup from cutting her song dead
// the moment the reply commits (the long-standing gap: MOVE_SFX_SKIP said
// "the music engine carries sing", but no engine was ever started). The
// piano trigger starts the Karplus-Strong piano arrangement — the theme's
// melody in her right hand over rolling broken chords in her left — while
// her body plays the seated keys choreography and the piano prop stands in.
// r2026-10-04.87: a real Silero VAD now rides the mic (lib/vad.ts) — it hears
// raw audio frames, so it knows REAL speech from background noise the instant
// your voice starts (faster barge-in than waiting for the first recognized
// word), and the moment you actually stop talking flushes the pending words
// into the chat after a ~0.7s grace — no more blind silence guessing. The
// orb swells white-hot while YOU hold the floor. CDN-loaded with a full
// fallback: if the VAD can't load, voice mode behaves exactly like r86.
// r2026-10-04.87b: vadStopRef holds the VadHandle ({stop()}), not a bare
// function — TS2322/TS2349 broke the CI+Pages build.
// r2026-10-05.97: streamed replies speak the FIRST complete sentence live —
// she starts talking the moment a sentence closes in the stream instead of
// waiting for the whole reply (voice starts seconds earlier on long replies);
// if the finished reply is exactly that sentence, the final speak pass no
// longer repeats it.
// r2026-10-05.100: completion-gated speak guarantee — the r97 skip checked
// "did we TRY to speak the streamed first sentence", not "did sound actually
// START". On Simon's iPhone every tier could silently fail mid-stream and
// the final pass still skipped the re-speak: a perfect voice chain still
// produces total silence when nothing is allowed to call it. The skip now
// requires voiceStartedSince() — a stamp written ONLY inside a tier's
// audio-start callback — so a silently-failed streaming attempt falls
// through to the guaranteed full-reply speak. A rare double-speak beats
// permanent silence.
import { useEffect, useRef, useState } from 'react';
import { feedUtterance, applyLlmHints, triggerLaugh, triggerMove } from '../lib/companion';
import { detectMove } from '../lib/moves';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking, isSpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { pickMoodIdleLine } from '../lib/mood-chatter';
import { pickOuch, pickZoneOuch, ouchStyleFor } from '../lib/ouch';
import { pickLaugh, laughStyleFor, LAUGH_RE } from '../lib/laugh';
import { WARMUP_FIRST_MS, WARMUP_GAP_MS, WARMUP_MAX_LINES, pickWarmupLine } from '../lib/warmup';
import { clientChat } from '../lib/client-chat';
import { speak, stopSpeaking, speakThinkingFiller, sing, voiceStartedSince } from '../lib/voice';
import { pickSong, pickDuet, pickCharacterSong } from '../lib/songs';
import { startMusic, stopMusic, startPerformanceMusic, endPerformanceMusic } from '../lib/music';
import { characterSpecialty, pickShowcaseOffer, pickTutorialLine, SHOWCASE_START, SHOWCASE_YES_RE, type ShowcaseKind } from '../lib/showcase';
import { detectGame, startGame, playTurn, gameFarewellLine, type GameState } from '../lib/games';
import { DUET_TRIGGER, QUIT_RE, MEAL_TOGETHER_TRIGGER, duetInviteLine, duetGoodbyeLine, pickMealToast } from '../lib/activities';
import { detectExercise, startExercise, advanceExercise, exerciseFarewellLine, type ExerciseState } from '../lib/exercises';
import { buildDailyGreeting, buildMemoryBlock, feltMood, greetingHints, memorySummaryCount, moodToHints, recordVisit, rememberExchange, rememberTurn } from '../lib/memory';
import { listenContinuous, listenSupported } from '../lib/listen';
import { startVad } from '../lib/vad';
import { ambientStart, ambientStop, playPokeSfx } from '../lib/sfx';
import { t, backgroundById, type Lang, type StrKey } from '../lib/prefs';
import { adaptiveBlock, pickSceneLine } from '../lib/adaptive';
import { loadProfile, type Gender } from '../lib/profile';
import type { ChatStatus } from '../lib/status';
import EmotionOrb from './EmotionOrb';

interface Msg { role: 'user' | 'assistant'; content: string }

export interface ChatPanelProps {
  characterName?: string;
  characterId?: string;
  lang?: Lang;
  accent?: string;
  persona?: string;
  /** current backdrop id — idle lines + prompt name this scene (r70) */
  backgroundId?: string;
  /** the companion's own gender — drives warm-vs-mate tone (r70) */
  characterGender?: 'female' | 'male';
  /** kid mode keeps every exchange friendship-only (r70) */
  kidMode?: boolean;
  /** increments when the user pokes the character — triggers a poke reply */
  pokeCount?: number;
  /** r115: where the latest poke landed ('head'|'body'|'armL'|'armR'|'belly') */
  pokeZone?: string;
  onStatus?: (s: ChatStatus) => void;
  onMemCount?: (n: number) => number | void;
}

const IDLE_AFTER_MS = 40_000;
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
  backgroundId = 'void',
  characterGender = 'female',
  kidMode = false,
  pokeCount = 0,
  pokeZone = '',
  onStatus,
  onMemCount,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  // r81 — the half-heard words of the current voice burst, painted live in
  // an italic user bubble; cleared the moment the utterance finalizes and
  // the committed message takes its place in the history
  const [liveText, setLiveText] = useState('');
  // r87 — the VAD currently hears YOU talking: the mic orb swells white-hot
  // so the button shows who holds the floor (and barge-in fires earlier)
  const [userSpeaking, setUserSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // r2026-10-05.120: the history is display-only — an invisible scroll pad
  // covering the LOWER THIRD of the screen is the only place that scrolls
  // it. The top 2/3 passes every touch straight through to the character
  // (rotate / poke / hand-drag).
  const scrollPadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pad = scrollPadRef.current;
    const hist = scrollRef.current;
    if (!pad || !hist) return;
    let startY = 0;
    let startScroll = 0;
    let vel = 0;
    let lastY = 0;
    let lastT = 0;
    let raf = 0;
    const onTS = (e: TouchEvent) => {
      cancelAnimationFrame(raf);
      startY = e.touches[0]!.clientY;
      lastY = startY;
      lastT = performance.now();
      vel = 0;
      startScroll = hist.scrollTop;
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault(); // React's synthetic handlers are passive — native isn't
      const y = e.touches[0]!.clientY;
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      vel = 0.7 * vel + 0.3 * ((y - lastY) / dt) * 16; // smoothed px/frame
      lastY = y;
      lastT = now;
      hist.scrollTop = startScroll - (y - startY);
    };
    const onTE = () => {
      // light momentum glide, clamped so it never rubber-bands oddly
      const glide = () => {
        vel *= 0.93;
        if (Math.abs(vel) < 0.4) return;
        hist.scrollTop = Math.max(0, hist.scrollTop - vel);
        raf = requestAnimationFrame(glide);
      };
      glide();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      hist.scrollTop += e.deltaY;
    };
    pad.addEventListener('touchstart', onTS, { passive: true });
    pad.addEventListener('touchmove', onTM, { passive: false });
    pad.addEventListener('touchend', onTE);
    pad.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      pad.removeEventListener('touchstart', onTS);
      pad.removeEventListener('touchmove', onTM);
      pad.removeEventListener('touchend', onTE);
      pad.removeEventListener('wheel', onWheel);
    };
  }, []);
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
  const micStopRef = useRef<{ stop(): void; flush(): void } | null>(null);
  // r87 — Silero VAD alongside the mic: its own stop handle, the grace timer
  // between "speech ended" and "flush the words", wired per mic session.
  // r87b: the ref holds the VadHandle ({stop()}), NOT a bare () => void —
  // assigning the handle to a function-typed ref was TS2322 and calling it
  // was TS2349.
  const vadStopRef = useRef<{ stop(): void } | null>(null);
  const vadGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laughCountRef = useRef(0);
  // r.47 — the last assistant bubble is a TRANSIENT placeholder while she
  // waits for her brain: warm-up lines and stream tokens paint it, and the
  // final reply commits in its place (never appended on top of it)
  const transientRef = useRef(false);
  // r.42 — together-mode state: a running mini-game, or a running duet
  const gameRef = useRef<GameState | null>(null);
  const duetRef = useRef<{ lines: string[]; idx: number } | null>(null);
  // r.45 — a running trainer lesson (yoga / tai chi / kung fu / warm-up);
  // every user message advances one step cue until the routine closes
  const exerciseRef = useRef<ExerciseState | null>(null);
  // r.48 — performance theatre: she offers private shows unprompted and
  // remembers the offer until you answer; a counter spaces the theatre out
  const pendingOfferRef = useRef<ShowcaseKind | null>(null);
  const perfCountRef = useRef(0);
  const lastFeltRef = useRef<string | undefined>(undefined);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const onMemCountRef = useRef(onMemCount);
  onMemCountRef.current = onMemCount;

  // r70 — the user's own gender (Settings → "You are"; never-set = undefined,
  // which the adaptive block treats as 'secret': no warmth guidance at all,
  // so users who never pick keep exactly the behaviour they had before).
  const [userGender, setUserGender] = useState<Gender | undefined>(() => loadProfile().gender);
  useEffect(() => {
    const sync = () => setUserGender(loadProfile().gender);
    window.addEventListener('amoji:profile', sync);
    return () => window.removeEventListener('amoji:profile', sync);
  }, []);

  // r82 — the backdrop now has a VOICE: rain patter + distant thunder on the
  // rainy-night scene, campfire crackle at the ember camp, wind and birdsong
  // over the meadow, a warm drone under the stars. The bed rebuilds whenever
  // the scene changes (e.g. switching backdrops from the Change page) and
  // fades out when the chat panel unmounts.
  useEffect(() => {
    ambientStart(backgroundId);
    return () => ambientStop();
  }, [backgroundId]);

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
  // never leave the mic (or the VAD) running if the panel unmounts
  useEffect(() => () => { micStopRef.current?.stop(); vadStopRef.current?.stop(); }, []);
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

  // r70 — the full persona her brain receives: her character persona plus the
  // adaptive block (scene name + warmth calibration). Both lanes below pass
  // this opaque string straight into the system prompt.
  const fullPersona = (): string => {
    const sceneName = t(lang, backgroundById(backgroundId).nameKey as StrKey);
    return `${persona ?? ''}${adaptiveBlock({ sceneId: backgroundId, sceneName, characterGender, userGender, kidMode })}`;
  };

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
  // r86: a sing trigger starts her backing track on the PERFORMANCE layer —
  // it now survives the commitReply/finally stopMusic() cleanup and plays
  // for the whole 9s show; a piano trigger starts the Karplus-Strong piano
  // arrangement for the 6s keys performance, hands at the keys.
  // r100: `alreadySpoken` carries the streamed first sentence PLUS the stamp
  // from the moment we tried to speak it — the re-speak skip only applies
  // when that attempt's audio provably STARTED (voiceStartedSince), never
  // merely because we tried.
  const speakReply = (userText: string, reply: string, hints?: Record<string, number>, intensity = 1, mood?: string, alreadySpoken?: { text: string; since: number }): string => {
    const mv = detectMove(userText) ?? detectMove(reply);
    // r97 — the first sentence already went out live over the stream; when
    // the finished reply is exactly that sentence, a second speak would
    // replay it. r100 — BUT only when its audio actually STARTED: on the
    // iPhone every tier can silently fail and "we tried" must never suppress
    // the reply itself. Still fire the move trigger and the speaking notice
    // either way; fall through to the full speak when sound never began.
    if (alreadySpoken && reply.trim() === alreadySpoken.text.trim() && voiceStartedSince(alreadySpoken.since)) {
      if (mv) triggerMove(mv);
      notifySpeaking(reply);
      return reply;
    }
    // r.40 — she really sings: a short lyric-like reply rides the melody as-is;
    // a longer one becomes a little ditty from the per-language song bank.
    if (mv === 'sing') {
      triggerMove('sing');
      applyLlmHints({ joy: 0.85 });
      startPerformanceMusic('band', characterId, 9300); // r86 — the band plays for the whole song
      const compact = reply.replace(/\s/g, '');
      const song = compact.length > 0 && compact.length <= 48
        ? reply
        : pickSong(lang, laughCountRef.current).join(' ');
      notifySpeaking(song);
      sing(song, characterId, lang);
      return song;
    }
    // r86 — the piano performance finally SOUNDS like a piano: the theme's
    // melody in her right hand over rolling broken chords in her left, on a
    // physical-model timbre, for the 6s her body plays the seated keys.
    if (mv === 'piano') {
      triggerMove('piano');
      applyLlmHints({ joy: 0.6 });
      startPerformanceMusic('piano', characterId, 6300);
      notifySpeaking(reply);
      speak(reply, characterId, lang, hints, undefined, intensity);
      return reply;
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
  // r82: the poke now LANDS audibly too — a soft boing + padded thump rides
  // the ouch cry, exactly the unitree-style feedback Master Simon asked for.
  const lastPokeRef = useRef(pokeCount);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    playPokeSfx();
    const ouchMood = lastFeltRef.current;
    const style = ouchStyleFor(ouchMood);
    // r115: a zoned poke (head/arm/belly…) cries for that body part first;
    // an unknown zone keeps the classic personality cry.
    const ouch = pickZoneOuch(pokeZone, lang, pokeCount) ?? pickOuch(characterId, lang, pokeCount, ouchMood);
    sayLocal(pickPokeLine(characterId, lang, pokeCount), { surprise: style.surprise, joy: style.joy }, { text: ouch, pitch: style.pitch, rate: style.rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCount]);

  // idle chatter + staged re-engagement (r.38): she never lets a quiet room
  // die. Measured from the USER's last real action (message, poke, spoken
  // word, mic tap) — her own lines don't restart the clock. Stage 0 (<2 min
  // of user silence) = her usual persona/mood idle lines; stage 1 (2 min+) =
  // direct "you've gone quiet" follow-ups that lean in harder; stage 2 (5
  // min+) = one soft closer ("I'll be right here") and then she simply
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
      // r.48 — every few quiet moments she either teaches you something she
      // can do for you, or offers a private performance; the offer stays
      // outstanding until you answer, and your "yes" starts the show
      if (n % 4 === 1) {
        sayLocal(pickTutorialLine(lang, n), feltHints);
        return;
      }
      if (n % 4 === 3 && !pendingOfferRef.current) {
        const kind = characterSpecialty(characterId);
        pendingOfferRef.current = kind;
        sayLocal(pickShowcaseOffer(kind, lang, n), feltHints);
        return;
      }
      // r.70 — scene-aware idle chatter: her mood line wins, then a line
      // belonging to the current backdrop (aurora ≠ rainy night), then the
      // character's persona bank as the final fallback.
      const line = (idleMood ? pickMoodIdleLine(idleMood, lang, n) : undefined)
        ?? pickSceneLine(backgroundId, lang, n)
        ?? pickIdleLine(characterId, lang, n);
      sayLocal(line, feltHints);
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, backgroundId]);

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
    endPerformanceMusic(); // r86 — a new message interrupts any live show
    // r.42 — together-modes intercept the turn BEFORE any LLM work: quitting
    // a running game/duet, advancing a running game, taking the next duet
    // line, starting a new game, or starting a duet. r.45 adds the trainer
    // lessons to the same intercept lane. All of these answer instantly in
    // her own voice — no thinking filler, no brain needed.
    const done = () => {
      setBusy(false);
      busyRef.current = false;
      lastActivityRef.current = Date.now();
    };
    if (QUIT_RE.test(text) && (gameRef.current || duetRef.current || exerciseRef.current)) {
      const line = gameRef.current
        ? gameFarewellLine(lang)
        : duetRef.current
          ? duetGoodbyeLine(lang)
          : exerciseFarewellLine(exerciseRef.current!.kind, lang);
      gameRef.current = null;
      duetRef.current = null;
      exerciseRef.current = null;
      endPerformanceMusic(); // r86 — quitting the duet ends its music
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
      // r86 — every duet line now sings over her backing track; the preserve
      // flag keeps it alive across the whole call-and-response (each line
      // re-arms the 40s window), and the last line or "quit" ends the show
      startPerformanceMusic('band', characterId, 40_000);
      const d = duetRef.current;
      const line = d.lines[d.idx]!;
      sing(line, characterId, lang);
      notifySpeaking(line);
      feedUtterance(line);
      triggerMove('sing');
      setHistory((h) => [...h, { role: 'assistant', content: line }]);
      d.idx += 1;
      if (d.idx >= d.lines.length) {
        duetRef.current = null;
        endPerformanceMusic(); // the duet is over — the band bows out
      }
      done();
      return;
    }
    // r.45 — a running trainer lesson: the next step cue. Her body demos
    // the matching move while she counts you through it, Wii Fit-style.
    if (exerciseRef.current) {
      const ex = advanceExercise(exerciseRef.current, lang);
      exerciseRef.current = ex.state;
      triggerMove(ex.move);
      sayLocal(ex.line, ex.hints);
      done();
      return;
    }
    {
      const x = detectExercise(text);
      if (x) {
        // r.45 — "follow the trainer": she leads a step-by-step routine,
        // demos every cue with the matching movement-library performance,
        // and the lesson runs LLM-free — instant even with a slow brain
        const ex = startExercise(x, lang);
        exerciseRef.current = ex.state;
        triggerMove(ex.move);
        sayLocal(ex.line, ex.hints);
        done();
        return;
      }
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
      startPerformanceMusic('band', characterId, 40_000); // r86 — the duet has a band from the first beat
      sayLocal(duetInviteLine(lang));
      done();
      return;
    }
    // r.48 — she offered you a performance a moment ago and you said yes:
    // the show starts RIGHT NOW, no brain needed — her signature song sung
    // live on the melodic contour, or a full dance number, both over an
    // original WebAudio theme composed for her personality
    if (pendingOfferRef.current && SHOWCASE_YES_RE.test(text)) {
      const kind = pendingOfferRef.current;
      pendingOfferRef.current = null;
      perfCountRef.current += 1;
      applyLlmHints({ joy: 0.85 });
      sayLocal(SHOWCASE_START[lang][kind]);
      triggerMove(kind === 'song' ? 'sing' : 'dance');
      endPerformanceMusic(); // r86 — clear any leftover show before the new one
      startMusic(characterId);
      if (kind === 'song') {
        const song = pickCharacterSong(characterId, lang, perfCountRef.current).join(' ');
        notifySpeaking(song);
        sing(song, characterId, lang);
        setHistory((h) => [...h, { role: 'assistant', content: song }]);
      }
      window.setTimeout(stopMusic, 9500);
      done();
      return;
    }
    pendingOfferRef.current = null; // any other answer lets the offer lapse
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
    // r.47 — ONE transient placeholder bubble carries the whole wait. It
    // starts as '…'; preloaded warm lines (praise, curiosity,
    // encouragement — her language, her felt mood) replace it every few
    // seconds and are spoken aloud, so the load time reads as her reacting
    // to you; the first stream token takes the bubble over, and the final
    // reply commits in its place.
    setHistory((h) => [...h, { role: 'assistant', content: '…' }]);
    transientRef.current = true;
    let warmCount = 0;
    let warmTimer: ReturnType<typeof setTimeout>;
    const playWarm = () => {
      if (warmCount >= WARMUP_MAX_LINES || !transientRef.current) return;
      const line = pickWarmupLine(characterId, lang, warmCount, text, felt?.mood);
      warmCount += 1;
      setHistory((h) => {
        const last = h.length - 1;
        const tail = h[last];
        if (!tail || tail.role !== 'assistant') return h;
        return [...h.slice(0, last), { ...tail, content: line }];
      });
      notifySpeaking(line);
      speak(line, characterId, lang, feltHints ?? { joy: 0.5, neutral: 0.4 }, undefined, felt?.intensity);
      warmTimer = setTimeout(playWarm, WARMUP_GAP_MS);
    };
    warmTimer = setTimeout(playWarm, WARMUP_FIRST_MS);
    // r.48 — every few turns the wait itself becomes a show: she breaks into
    // a dance over her own original theme while her brain works, so a slow
    // reply reads as a performance, never a loading bar
    if ((perfCountRef.current += 1) % 3 === 1) {
      triggerMove('dance');
      startMusic(characterId);
    }
    // one exit path for every outcome: the final reply (or the failure note)
    // takes the placeholder's place instead of stacking a second bubble
    const commitReply = (content: string) => {
      stopMusic(); // r.48 — the show ends the moment her real reply lands
      // r86 — a live sing/duet/piano performance survives this stopMusic()
      // (the performance layer preserves it); a plain dance bed still ends
      const replace = transientRef.current;
      transientRef.current = false;
      setHistory((h) => {
        const tail = h[h.length - 1];
        if (replace && tail?.role === 'assistant') return [...h.slice(0, -1), { role: 'assistant', content }];
        return [...h, { role: 'assistant', content }];
      });
    };
    // learn from the user's words, then inject what she remembers into her prompt
    onMemCountRef.current?.(memorySummaryCount(rememberExchange(text)));
    const memory = buildMemoryBlock(lang);
    // r70 — persona + adaptive block (scene + warmth calibration)
    const personaForBrain = fullPersona();
    let answered = false;
    // r97 — the first complete sentence of a streamed reply, spoken live the
    // moment it closes (see onPartial below); '' until then.
    // r100 — sentenceStamp is captured at that live-speak attempt, so the
    // final pass can tell "sound started" from "we tried and nothing came".
    let firstSentence = '';
    let sentenceStamp = 0;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, persona: personaForBrain, memory }),
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
      commitReply(spoken);
      answered = true;
    } catch {
      // no server (e.g. static GitHub Pages build) — free keyless LLM from the browser
      try {
        // stream the reply live into the placeholder bubble — first tokens
        // show up immediately instead of after the whole generation finishes
        const r = await clientChat([...history, { role: 'user', content: text }], {
          language: lang,
          persona: personaForBrain,
          memory,
          onPartial: (partial) => {
            // r.47 — the real stream is painting now: the warm-up loop stands down
            clearTimeout(warmTimer);
            warmCount = WARMUP_MAX_LINES;
            // hide a half-typed [emotion:{...}] tag so it never flashes on screen
            const clean = partial
              .replace(/\[emotion:[^\]]*$/, '')
              .replace(/\[emotion:\{[^}]*\}\]/, '');
            // r97 — the first closed sentence speaks LIVE: the moment a full
            // sentence has streamed in, she starts saying it instead of
            // waiting for the whole reply (voice starts seconds earlier on
            // long replies). The final speakReply skips the re-speak when
            // the reply turns out to be exactly this sentence — r100: and
            // only when this attempt's audio actually STARTED.
            if (!firstSentence) {
              const m = /^[^。！？.!?\n]+[。！？.!?]/.exec(clean);
              if (m) {
                firstSentence = m[0];
                sentenceStamp = Date.now();
                notifySpeaking(firstSentence);
                speak(firstSentence, characterId, lang, feltHints ?? { joy: 0.4, neutral: 0.3 }, undefined, felt?.intensity);
              }
            }
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
        const spoken = speakReply(
          text,
          r.reply,
          replyHints,
          felt?.intensity,
          felt?.mood,
          firstSentence ? { text: firstSentence, since: sentenceStamp } : undefined,
        );
        commitReply(spoken);
        answered = true;
      } catch {
        // drop the placeholder only if nothing ever streamed; partial text stays
        setHistory((h) => {
          const tail = h[h.length - 1];
          return tail && tail.role === 'assistant' && tail.content === '…' ? h.slice(0, -1) : h;
        });
      }
    } finally {
      clearTimeout(warmTimer); // reply (or failure) is here — stop the warm-up
      stopMusic(); // r.48 — belt-and-braces: no PLAIN music outlives the turn
      // r86 — a live sing/duet/piano performance survives this stopMusic();
      // it ends on its own performance timer or the next user interrupt
      if (!answered) commitReply('… (connection hiccup — I’m still here)');
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
  // r87: a Silero VAD now watches the raw audio frames alongside — it hears
  // real speech BEFORE the first recognized word (so barge-in is earlier and
  // noise can never fake it) and knows the true moment you stop talking. If
  // the VAD can't load, everything falls back to the r86 behaviour exactly.
  const mic = () => {
    if (micModeRef.current) {
      micModeRef.current = false;
      micStopRef.current?.stop();
      micStopRef.current = null;
      if (vadGraceRef.current) { clearTimeout(vadGraceRef.current); vadGraceRef.current = null; }
      vadStopRef.current?.stop();
      vadStopRef.current = null;
      setUserSpeaking(false);
      listeningRef.current = false;
      setListening(false);
      setLiveText(''); // r81 — a half-spoken line must not linger on screen
      stopMusic(); // r.48 — leaving voice mode ends any performance bed
      endPerformanceMusic(); // r86 — and any preserved show too
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
    stopMusic();    // r.48 — the user's voice takes the stage, not the track
    endPerformanceMusic(); // r86 — any live show bows out for the user
    let bargeInArmed = true; // first real speech of a burst cuts her off
    const micHandle = listenContinuous(lang, {
      // r87 — the VAD owns endpointing now; its onPartial flushes via handle
      externalEndpoint: true,
      onSpeechStart: () => {
        if (!bargeInArmed) return;
        bargeInArmed = false;
        stopSpeaking(); // the user is really talking — cut her voice NOW
        stopMusic();    // r.48 — and the performance bed too
        endPerformanceMusic(); // r86 — and the preserved show too
      },
      // r81 — the half-heard words paint a live italic bubble, ChatGPT-style.
      // Talking counts as user activity, and the view chases the newest
      // words only while you're already at the bottom (never yanks you
      // out of a history scroll).
      onInterim: (partial) => {
        setLiveText(partial);
        if (partial) {
          lastActivityRef.current = Date.now();
          lastUserRef.current = Date.now();
          reengageStageRef.current = 0;
          if (nearBottomRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }
      },
      onFinal: (said) => {
        bargeInArmed = true;
        setLiveText(''); // the committed message takes the bubble's place
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
        if (vadGraceRef.current) { clearTimeout(vadGraceRef.current); vadGraceRef.current = null; }
        vadStopRef.current?.stop();
        vadStopRef.current = null;
        setUserSpeaking(false);
        listeningRef.current = false;
        setListening(false);
        setLiveText('');
      },
    });
    micStopRef.current = micHandle;
    // r87 — Silero VAD rides alongside the recognizer: it sees raw audio, so
    // it knows real speech the instant it starts (noise never crosses the
    // threshold) and knows the true moment you stop talking. Either signal
    // simply never arriving leaves voice mode exactly as it was in r86.
    void startVad({
      onSpeechStart: () => {
        setUserSpeaking(true);
        if (vadGraceRef.current) { clearTimeout(vadGraceRef.current); vadGraceRef.current = null; }
        if (bargeInArmed) {
          bargeInArmed = false;
          stopSpeaking();
          stopMusic();
          endPerformanceMusic();
        }
        lastActivityRef.current = Date.now();
        lastUserRef.current = Date.now();
        reengageStageRef.current = 0;
      },
      onSpeechEnd: () => {
        setUserSpeaking(false);
        // ~0.7s grace: a genuinely finished sentence flushes its pending
        // words into the chat; a mid-thought pause just keeps listening
        if (vadGraceRef.current) clearTimeout(vadGraceRef.current);
        vadGraceRef.current = setTimeout(() => micHandle.flush(), 700);
      },
    }).then((vadHandle) => {
      // r87b: .then() receives the VadHandle ({stop()}) or null — store it
      // as-is and call .stop() everywhere; a bare function call was TS2349.
      if (micModeRef.current) vadStopRef.current = vadHandle;
      else vadHandle?.stop();
    });
  };

  return (
    <div className="pointer-events-auto relative mx-auto flex w-full max-w-2xl flex-col items-center gap-1.5 px-4 pb-4">
      {/* boxless history — fully opaque messages; only the on-screen height
          fades (bottom line 100%, each line a step dimmer). Scrolling an
          old line DOWN into the bright zone makes it crisp and readable. */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="pointer-events-none w-full select-none space-y-2.5 overflow-y-auto px-2 pb-1 pt-6 [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_22%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.6)_56%,rgba(0,0,0,0.8)_72%,black_90%)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_22%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.6)_56%,rgba(0,0,0,0.8)_72%,black_90%)]"
        style={{ maxHeight: '34vh' }}
      >
        {history.length === 0 && <p className="text-center text-white/40">{t(lang, 'sayHi', { name: characterName })}</p>}
        {history.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} className={isUser ? 'text-right' : 'text-left'}>
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
        {/* r81 — the words you're speaking RIGHT NOW: italic + slightly dimmed
            in your accent colour, replaced by the committed message the
            instant the ~1s silence endpoint sends it, exactly like ChatGPT. */}
        {liveText.trim() && (
          <div className="text-right">
            <p className="italic opacity-75" style={{ color: accent }}>{liveText}</p>
          </div>
        )}
        {busy && <p className="text-white/40">{t(lang, 'typing', { name: characterName })}</p>}
      </div>

      {/* input row — ChatGPT-style hero mic with the living emotion orb */}
      <div className="flex w-full items-center gap-2.5">
        {/* r84: NO backdrop-filter on this button. WebKit frosts the whole
            RECTANGULAR border-box of a backdrop-filter element no matter the
            border-radius (r62's overflow:hidden only cured some iOS builds),
            which was the persistent "square behind the circle". Solid
            bg-black/55 keeps the same readability with zero blur — nothing
            rectangular is rendered at all. */}
        <button
          onClick={() => mic()}
          title={t(lang, 'micTitle')}
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/55 transition active:scale-95"
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
          {(listening || speakingNow) && <EmotionOrb size={72} accent={accent} listening={listening} userSpeaking={userSpeaking} />}
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
          placeholder={t(lang, 'sayHi', { name: characterName } )}
          className="h-11 flex-1 overflow-hidden rounded-full border border-white/10 bg-black/30 px-4 text-[15px] text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-white/40"
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

      {/* r2026-10-05.120 — the only scroll zone. Invisible strip over the
          lower third of the screen; its JS (mounted above) drags the
          display-only history. Everything above this strip belongs to the
          character. */}
      <div
        ref={scrollPadRef}
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-0"
        style={{ height: '33dvh', touchAction: 'none' }}
      />
    </div>
  );
}
