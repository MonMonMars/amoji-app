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
// r2026-10-06.136: ROOT CAUSE of the dead mic/textbox — the r120 lower-third
// scroll pad is `absolute inset-x-0 bottom-0 z-0` INSIDE this panel and
// renders AFTER the input row; at the same stacking level later DOM wins,
// so the pad painted over and hit-tested AHEAD of the hero mic and the text
// field ("can't click the text box and the mic button"). The input row now
// carries z-10 so it takes its clicks back.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { feedUtterance, applyLlmHints, setThinkingPose, triggerLaugh, triggerMove, holdMove, setPerfMotionProfile } from '../lib/companion';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { detectMove } from '../lib/moves';
import { loadHistory, saveHistory } from '../lib/companion-store';
import { notifySpeaking, isSpeaking } from '../lib/speech';
import { pickLine } from '../lib/chatter';
import { pickIdleLine } from '../lib/persona-chatter';
import { pickIdleCompanionLine } from '../lib/idle-talk';
import { pickMoodIdleLine } from '../lib/mood-chatter';
import { pickCharacterInteraction } from '../lib/interaction-lines';
import { pokeSectionPlaceholderLine, type PokeSectionId } from '../lib/poke-zones';
import { personalityProfile, personalityPrompt } from '../lib/personality';
import { voiceOpening, type VoiceId } from '../lib/personality-voice';
import { laughStyleFor, LAUGH_RE } from '../lib/laugh';
import { assetUrl } from '../lib/asset';
import { clientChat, markNoApiRoute, shouldSkipServerProbe, warmLane } from '../lib/client-chat';
import { guardCompanionTurn } from '../lib/crisis';
import {
  checkChatTurnQuota,
  consumeChatTurn,
  quotaExceededCopy,
} from '../lib/daily-quota';
import { clientLiveContext, isLiveFactsOnlyTurn, planTools } from '../lib/live-tools';
import { withQuestion } from '../lib/follow-up';
import {
  OPEN_CHEER_MS,
  OPEN_IDLE_BRIEF_MS,
  buildOpenCheerLine,
  isFreshOpenPhase,
  markChatRoomClosed,
  markChatRoomOpened,
  markOpenIdleBriefDone,
  openIdleBriefAlreadyDone,
  markOpenCheerDone,
  openCheerAlreadyDone,
  openPhaseTopicAsk,
  shouldPlayOpenCheer,
} from '../lib/open-phase';
import {
  formatTopicSuggestionLine,
  pickTopicSuggestions,
  undecidedTopicReply,
  userUndecided,
} from '../lib/topic-suggestions';
import { speak, stopSpeaking, sing, playPokeBurst, playLaughBurst, voiceStartedSince, speechPending, speechStillQueued, speechRemainder, whenSpeechIdle, speakThinkingFiller } from '../lib/voice';
import { productionChat } from '../lib/backend-client';
import { stopThinkingSound } from '../lib/thinking-sound';
import { pickSong, pickDuet, pickCharacterSong } from '../lib/songs';
import { stopMusic, startPerformanceMusic, endPerformanceMusic, startLibraryPerformance } from '../lib/music';
import { clipLabel, PERFORMANCE_CLIPS, type PerformanceClip } from '../lib/performance-clips';
import { resolvePerfMotion } from '../lib/performance-motion';
import { SHOWCASE_START, SHOWCASE_YES_RE, pickShowcaseOffer, skillOfferKind, type ShowcaseKind } from '../lib/showcase';
import { recentUserMood } from '../lib/talk-history';
import { detectGame, startGame, playTurn, gameFarewellLine, type GameState } from '../lib/games';
import { detectActionGame, setMiniGameChromeHidden, subscribeMiniGameOpen, type ActionGame } from '../lib/minigames';
import MiniGameOverlay from './MiniGameOverlay';
import ChatMessage from './ChatMessage';
import ReportDialog from './ReportDialog';
import { DUET_TRIGGER, QUIT_RE, MEAL_TOGETHER_TRIGGER, duetInviteLine, duetGoodbyeLine, pickMealToast } from '../lib/activities';
import { detectExercise, startExercise, advanceExercise, exerciseFarewellLine, type ExerciseState } from '../lib/exercises';
import {
  buildDailyGreeting, buildEnterNameGreeting, buildMemoryBlock, ensureUserNameFromProfile, feltMood,
  forgetInjectedMemory, greetingHints, memorySummaryCount, moodToHints, recordVisit, rememberExchange,
  rememberTurn, type TurnMemoryUsed,
} from '../lib/memory';
import { listenContinuous, listenSupported } from '../lib/listen';
import { getEntryGateRecord, micPreflightGrantedThisSession } from '../lib/entry-gate';
import {
  bindVoiceChatFocusLifecycle,
  duckExternalAudioForCompanion,
  enterVoiceChatAudioSession,
  leaveVoiceChatAudioSession,
  pauseForeignPageMedia,
} from '../lib/voice-chat-focus';
import { startVad } from '../lib/vad';
import { ambientStart, ambientStop } from '../lib/sfx';
import { t, backgroundById, type Lang, type StrKey } from '../lib/prefs';
import { adaptiveBlock } from '../lib/adaptive';
import { SPEECH_CAPTION_EVENT, rollingCaptionFromText } from '../lib/speech-caption';
import { loadProfile, type Gender } from '../lib/profile';
import type { ChatStatus } from '../lib/status';
import EmotionOrb from './EmotionOrb';

interface Msg { role: 'user' | 'assistant'; content: string; memoryUsed?: TurnMemoryUsed[] }

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
  /** where the latest poke landed */
  pokeZone?: string;
  /** front | back | left | right — the side the punch came from */
  pokeDirection?: string;
  /** `poke:${tier}:${angle}` — 24-slot voice key from canvas hit test */
  pokeSectionId?: string;
  /** increments when the user holds a hand */
  handHoldCount?: number;
  onStatus?: (s: ChatStatus) => void;
  onMemCount?: (n: number) => number | void;
  /** Content-driven idle clip for CompanionCanvas (replaces manual rail pins). */
  onAutoIdle?: (clipId: string | null) => void;
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
  pokeDirection = 'front',
  pokeSectionId = '',
  handHoldCount = 0,
  onStatus,
  onMemCount,
  onAutoIdle,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  /** User turned voice mode off (distinct from pre-first-open idle). */
  const [micDismissed, setMicDismissed] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  /** Clause synced to active TTS (movie subtitle). */
  const [speechCaption, setSpeechCaption] = useState('');
  /** Streamed reply draft — not painted full-width in history while speaking. */
  const [streamDraft, setStreamDraft] = useState('');
  const [pinnedBottom, setPinnedBottom] = useState(true);
  // r81 — the half-heard words of the current voice burst, painted live in
  // an italic user bubble; cleared the moment the utterance finalizes and
  // the committed message takes its place in the history
  const [liveText, setLiveText] = useState('');
  // r87 — the VAD currently hears YOU talking: the mic orb swells white-hot
  // so the button shows who holds the floor (and barge-in fires earlier)
  const [userSpeaking, setUserSpeaking] = useState(false);
  // r119 — the no-audio watchdog armed a replay: show the tap-to-replay chip
  const [replayHint, setReplayHint] = useState(false);
  // premade sing/dance clip currently on stage — the name is the visible pick
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  // the last turn was caught by the crisis guard — show the /safety card
  const [crisisCard, setCrisisCard] = useState(false);
  // the AI reply the user is reporting (null = the report sheet is closed)
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [actionGame, setActionGame] = useState<ActionGame | null>(null);
  const actionGameRef = useRef(false);
  const [clipState, setClipState] = useState<'starting' | 'playing' | null>(null);
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onClip = (e: Event) => {
      const detail = (e as CustomEvent<{ state?: string; id?: string }>).detail;
      if (detail?.state === 'playing' && detail.id) {
        const clip = PERFORMANCE_CLIPS.find((c) => c.id === detail.id);
        if (clip) setNowPlaying(clipLabel(clip, lang));
        setClipState('playing');
      } else if (detail?.state === 'stopped') {
        setClipState((s) => (s === 'playing' ? null : s));
      }
    };
    window.addEventListener('amoji:library-clip', onClip);
    return () => window.removeEventListener('amoji:library-clip', onClip);
  }, [lang]);
  useEffect(() => {
    const onHint = (e: Event) => setReplayHint(!!((e as CustomEvent<{ armed?: boolean }>).detail?.armed));
    window.addEventListener('amoji:voice-replay-hint', onHint);
    return () => window.removeEventListener('amoji:voice-replay-hint', onHint);
  }, []);
  useEffect(() => {
    const onCap = (e: Event) => {
      const line = (e as CustomEvent<{ line?: string }>).detail?.line ?? '';
      setSpeechCaption(line);
    };
    window.addEventListener(SPEECH_CAPTION_EVENT, onCap);
    return () => window.removeEventListener(SPEECH_CAPTION_EVENT, onCap);
  }, []);
  // r126 — warm the free lane while she's still saying hello: DNS+TLS and a
  // live connection are ready before the first real message is typed/spoken
  useEffect(() => { warmLane(); }, []);
  useEffect(() => bindVoiceChatFocusLifecycle(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const busyRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastUserRef = useRef(Date.now());
  const lastChatterAtRef = useRef(0);
  const chatterCountRef = useRef(0);
  const reengageStageRef = useRef(0);
  const greetedRef = useRef(false);
  /** Phase 2: user has sent a real chat turn this open stretch. */
  const userHasSpokenRef = useRef(false);
  /** Open-phase auto weather/news already fired this mount. */
  const openIdleBriefDoneRef = useRef(false);
  /** After Phase 2, one idle auto weather/news per quiet stretch. */
  const idleAutoAfterUserRef = useRef(false);
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
  const micAutoArmedRef = useRef(false);
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
  const onAutoIdleRef = useRef(onAutoIdle);
  onAutoIdleRef.current = onAutoIdle;
  const pushAutoIdle = (assistantText: string, emotionHints?: Record<string, number>, thinking?: boolean) => {
    onAutoIdleRef.current?.(resolveChatAutoIdle({ assistantText, emotionHints, thinking }));
  };

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
  useEffect(() => () => {
    micStopRef.current?.stop();
    vadStopRef.current?.stop();
    micModeRef.current = false;
    leaveVoiceChatAudioSession();
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

  // r70 — the full persona her brain receives: her character persona plus the
  // adaptive block (scene name + warmth calibration). Both lanes below pass
  // this opaque string straight into the system prompt.
  const fullPersona = (): string => {
    const sceneName = t(lang, backgroundById(backgroundId).nameKey as StrKey);
    return `${persona ?? ''}\n${personalityPrompt(characterId, characterGender)}${adaptiveBlock({ sceneId: backgroundId, sceneName, characterGender, userGender, kidMode })}`;
  };

  const sayLocal = (
    text: string,
    hints?: Record<string, number>,
    lead?: { text: string; pitch: number; rate: number },
  ) => {
    feedUtterance(text);
    notifySpeaking(lead ? `${lead.text} ${text}` : text);
    const remembered = recentUserMood();
    const voiced = remembered
      ? { ...(hints ?? {}), [remembered]: Math.max(hints?.[remembered] ?? 0, 0.45) }
      : hints;
    speak(text, characterId, lang, voiced, lead);
    if (voiced) applyLlmHints(voiced);
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
  // the melodic contour (lyric-like replies ride as-is; longer ones become
  // a ditty from the song bank) and the history shows exactly what she sang.
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
  const showTrack = (clip: PerformanceClip | null, ms = 0) => {
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    trackTimerRef.current = null;
    if (!clip) {
      setNowPlaying(null);
      setClipState(null);
      return;
    }
    setNowPlaying(clipLabel(clip, lang));
    setClipState((s) => (s === 'playing' ? 'playing' : 'starting'));
    trackTimerRef.current = setTimeout(() => setNowPlaying(null), ms + 400);
  };

  const beginActionGame = (kind: ActionGame) => {
    actionGameRef.current = true;
    gameRef.current = null;
    duetRef.current = null;
    exerciseRef.current = null;
    setThinkingPose(false);
    endPerformanceMusic();
    showTrack(null);
    micModeRef.current = false;
    micStopRef.current?.stop();
    micStopRef.current = null;
    if (vadGraceRef.current) { clearTimeout(vadGraceRef.current); vadGraceRef.current = null; }
    vadStopRef.current?.stop();
    vadStopRef.current = null;
    setUserSpeaking(false);
    listeningRef.current = false;
    setListening(false);
    setLiveText('');
    setActionGame(kind);
  };

  /** Start a premade song (matched to her gender) or dance bed, and show the pick. */
  const beginShow = (kind: 'song' | 'dance', ms: number, mood?: string, n = laughCountRef.current, bed = false) => {
    // t718: music.ts arms to max(ms, clip.durationMs+600); hold body/mic for songs.
    const clip = startLibraryPerformance({
      kind,
      characterId,
      lang,
      mood,
      gender: characterGender,
      n,
      ms,
      bed,
    });
    // t725–729: song/style → body tag + beat-matched timeScale for CompanionCanvas.
    setPerfMotionProfile(resolvePerfMotion({ id: clip.id, kind: clip.kind, style: clip.style }));
    const hold = Math.max(clip.durationMs + 600, ms);
    if (kind === 'song') holdMove(hold);
    showTrack(clip, hold);
    return clip;
  };
  const speakReply = (userText: string, reply: string, hints?: Record<string, number>, intensity = 1, mood?: string, alreadySpoken?: { text: string; since: number }): string => {
    const mv = detectMove(userText) ?? detectMove(reply);
    // The first closed sentence already went out over the stream. If it is
    // still queued or its audio started, say only the rest — never replay
    // that sentence, and never cut it. If it never started and is gone from
    // the queue, fall through and speak the whole reply.
    const firstLive = !!alreadySpoken
      && mv !== 'sing'
      && (speechStillQueued(alreadySpoken.text) || voiceStartedSince(alreadySpoken.since));
    if (firstLive && alreadySpoken) {
      if (mv === 'dance') {
        triggerMove('dance');
        beginShow('dance', 9300, mood);
      } else if (mv) triggerMove(mv);
      notifySpeaking(reply);
      const rest = speechRemainder(reply, alreadySpoken.text);
      if (rest) speak(rest, characterId, lang, hints, undefined, intensity);
      return reply;
    }
    // Singing plays a premade clip in her gender's voice. The lyric still
    // lands in the bubble; TTS does not sing over the clip. The clip waits
    // its turn — a live sentence is not cut to start the song.
    if (mv === 'sing') {
      triggerMove('sing');
      applyLlmHints({ joy: 0.88 });
      whenSpeechIdle(() => beginShow('song', 9300, mood));
      const compact = reply.replace(/\s/g, '');
      const song = compact.length > 0 && compact.length <= 48
        ? reply
        : pickSong(lang, laughCountRef.current).join(' ');
      notifySpeaking(song);
      return song;
    }
    if (mv === 'dance') {
      triggerMove('dance');
      applyLlmHints({ joy: 0.72 });
      beginShow('dance', 9300, mood);
      notifySpeaking(reply);
      speak(reply, characterId, lang, hints, undefined, intensity);
      return reply;
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
        // Reactions SFX-only: body giggle + queued CLIP_LIBRARY laugh — never TTS hehe/haha lead.
    triggerLaugh();
    playLaughBurst(characterId, lang);
    applyLlmHints({ joy: style.joy });
    laughCountRef.current++;
    notifySpeaking(reply);
    speak(reply, characterId, lang, { ...(hints ?? {}), joy: style.joy }, undefined, intensity);
    return reply;
  };

  // t794/t796 + Pixel entry: hi + persona intro + topic ask; silent stretch
  // gets 2–3 topic suggestions (no auto weather/news). Session gap = fresh
  // open — clear history and skip lastThread resume. Keep #58 filler bans.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const fresh = isFreshOpenPhase();
    // Latch check BEFORE markChatRoomOpened so Strict Mode remount still sees
    // the prior openCheerAt >= lastOpenedAt (name greet once per stretch).
    const skipCheer = !fresh && openCheerAlreadyDone(characterId);
    markChatRoomOpened();
    const prior = loadHistory();
    const hadUser = prior.some((m) => m.role === 'user');
    if (fresh) {
      saveHistory([]);
      setHistory([]);
      userHasSpokenRef.current = false;
    } else if (hadUser) {
      userHasSpokenRef.current = true;
    }
    const userName = ensureUserNameFromProfile(loadProfile().name);
    const visit = recordVisit();
    const namedHello = buildEnterNameGreeting(lang, userName ?? visit.userName);
    const startupVars = { name: characterName };
    const shortDaily =
      !fresh && visit.isNewDay
        ? buildDailyGreeting(lang, visit, { skipThread: true, privacyOnly: true })
        : undefined;
    const profile = personalityProfile(characterId, characterGender);
    const personaIntro = voiceOpening(
      profile.personality as VoiceId,
      profile.motif,
      profile.frame,
      lang,
      characterName ?? 'friend',
    );
    const openLine =
      buildOpenCheerLine(lang, {
        nameHello: namedHello,
        personaIntro,
        topicAsk: openPhaseTopicAsk(lang),
      })
      || shortDaily
      || pickLine('startup', lang, 1, startupVars);
    if (skipCheer) {
      return () => { markChatRoomClosed(); };
    }
    const openHints = shortDaily ? greetingHints(visit) : namedHello ? { joy: 0.55 } : { joy: 0.58 };
    // One short welcome line; latch when it actually speaks (per-character).
    const t1 = setTimeout(() => {
      markOpenCheerDone(Date.now(), characterId);
      sayLocal(openLine, openHints);
    }, OPEN_CHEER_MS);
    const skipBrief =
      OPEN_IDLE_BRIEF_MS <= 0 ||
      userHasSpokenRef.current ||
      openIdleBriefAlreadyDone(characterId);
    const t3 = skipBrief
      ? null
      : setTimeout(() => {
          if (userHasSpokenRef.current || openIdleBriefDoneRef.current) return;
          if (userHasSpokenRef.current || busyRef.current) return;
          const topics = pickTopicSuggestions(lang, characterId?.length ?? 0, 3);
          const line = formatTopicSuggestionLine(lang, topics);
          if (!line) return;
          openIdleBriefDoneRef.current = true;
          markOpenIdleBriefDone(Date.now(), characterId);
          sayLocal(line, { joy: 0.52 });
        }, OPEN_IDLE_BRIEF_MS);
    return () => {
      clearTimeout(t1);
      if (t3) clearTimeout(t3);
      markChatRoomClosed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // poke reactions — SFX + VRM motion only; lip hooks run off the reaction line
  // but never land in persisted chat history or copy transcript.
  const lastPokeRef = useRef(pokeCount);
  const lastOfferAtRef = useRef(0);
  useEffect(() => {
    if (pokeCount === lastPokeRef.current) return;
    lastPokeRef.current = pokeCount;
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    // SFX-only poke (Mon t691–t696): no TTS reaction / laugh lead — clip by zone.
    playPokeBurst(characterId, pokeZone || 'torso');
    const key = (pokeSectionId || `poke:belly:${pokeDirection || 'front'}`) as PokeSectionId;
    const line = pokeSectionPlaceholderLine(key, lang);
    feedUtterance(line);
    notifySpeaking(line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokeCount]);

  const lastHandRef = useRef(handHoldCount);
  useEffect(() => {
    if (handHoldCount === lastHandRef.current) return;
    lastHandRef.current = handHoldCount;
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    const line = pickCharacterInteraction(characterId, characterGender, 'hand', lang);
    // t769/t771: no unsolicited TTS laugh lead on hand-hold.
    sayLocal(line, { joy: 0.55 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handHoldCount]);

  // idle chatter + staged re-engagement (r.38): she never lets a quiet room
  // die. Measured from the USER's last real action (message, poke, spoken
  // word, mic tap) — her own lines don't restart the clock. Stage 0 (<2 min
  // of user silence) = her usual persona/mood idle lines; stage 1 (2 min+) =
  // direct "you've gone quiet" follow-ups that lean in harder; stage 2 (5
  // min+) = one soft closer ("I'll be right here") and then she simply
  // waits instead of nagging. Her lines never pile onto her own voice.
  useEffect(() => {
    const timer = setInterval(() => {
      if (busyRef.current || isSpeaking() || speechPending() || actionGameRef.current) return;
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
      // Every fourth quiet line offers one skill. The gap keeps it from stacking.
      if (n > 0 && n % 4 === 3 && Date.now() - lastOfferAtRef.current > 90_000) {
        lastOfferAtRef.current = Date.now();
        const kind = skillOfferKind(n);
        pendingOfferRef.current = kind;
        sayLocal(pickShowcaseOffer(kind, lang, n), feltHints);
        return;
      }
      // After the user has spoken, one topic-menu hint per quiet stretch if
      // they have not picked a direction (no auto weather/news).
      if (userHasSpokenRef.current && !idleAutoAfterUserRef.current && !busyRef.current) {
        idleAutoAfterUserRef.current = true;
        const topics = pickTopicSuggestions(lang, chatterCountRef.current + 1, 3);
        sayLocal(formatTopicSuggestionLine(lang, topics), feltHints ?? { joy: 0.45 });
        return;
      }
      // Idle talk: stay on topic OR suggest a new one (statements).
      // Motif/topic banks rotate via idle-talk — less tea, no question-form chatter.
      // Idle tutor tips cut — do not interrupt idle companion time with how-to tips.
      // Showcase skill offers + Settings Help / showcase tutorial banks stay elsewhere.
      const line = (idleMood ? pickMoodIdleLine(idleMood, lang, n) : undefined)
        ?? pickIdleCompanionLine(characterId, characterGender, lang, n)
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
    if (userUndecided(text)) {
      lastActivityRef.current = Date.now();
      lastUserRef.current = Date.now();
      userHasSpokenRef.current = true;
      reengageStageRef.current = 0;
      setHistory((h) => [...h, { role: 'user', content: text }]);
      feedUtterance(text);
      const line = undecidedTopicReply(lang, text.length);
      sayLocal(line, { joy: 0.5 });
      return;
    }
    setBusy(true);
    busyRef.current = true;
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
    idleAutoAfterUserRef.current = false;
    nearBottomRef.current = true;
    setHistory((h) => [...h, { role: 'user', content: text }]);
    feedUtterance(text);
    stopSpeaking();
    endPerformanceMusic(); // r86 — a new message interrupts any live show
    showTrack(null);
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
    // Crisis / self-harm guard — FIRST, before games, duets, live facts and any
    // brain. A fixed human-written reply with real helplines, in her language.
    // The model never sees this turn: a 20B model must not improvise here.
    const crisis = guardCompanionTurn(text, lang);
    if (crisis.blocked) {
      setCrisisCard(true);
      sayLocal(crisis.reply, { sadness: 0.35 });
      done();
      return;
    }
    setCrisisCard(false);
    {
      const action = detectActionGame(text);
      if (action) {
        beginActionGame(action);
        done();
        return;
      }
    }
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
      showTrack(null);
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
    if (/\b(play (?:some )?music|put on (?:some )?music)\b|播音樂|播音乐|放音樂|放音乐|音楽をかけ/.test(text)) {
      perfCountRef.current += 1;
      beginShow('dance', 18_000, undefined, perfCountRef.current, true);
      sayLocal(SHOWCASE_START[lang].music);
      done();
      return;
    }
    if (pendingOfferRef.current && SHOWCASE_YES_RE.test(text)) {
      const kind = pendingOfferRef.current;
      pendingOfferRef.current = null;
      perfCountRef.current += 1;
      applyLlmHints({ joy: 0.85 });
      if (kind === 'news' || kind === 'weather') {
        const ask = kind === 'weather'
          ? (lang === 'ja' ? '今日の天気は？' : lang === 'zh' ? '今天天气怎么样？' : lang === 'yue' ? '今日天氣點呀？' : "what's the weather here?")
          : (lang === 'ja' ? '最新ニュースは？' : lang === 'zh' ? '今天有什么新闻？' : lang === 'yue' ? '今日有咩新聞？' : "what's the latest news?");
        void clientLiveContext(ask, lang).then((live) => {
          sayLocal(live.spoken || SHOWCASE_START[lang][kind]);
        });
        done();
        return;
      }
      if (kind === 'music') {
        beginShow('dance', 18_000, undefined, perfCountRef.current, true);
        sayLocal(SHOWCASE_START[lang].music);
        done();
        return;
      }
      triggerMove(kind === 'song' ? 'sing' : 'dance');
      beginShow(kind === 'song' ? 'song' : 'dance', 12_000, undefined, perfCountRef.current);
      sayLocal(SHOWCASE_START[lang][kind]);
      if (kind === 'song') {
        const song = pickCharacterSong(characterId, lang, perfCountRef.current).join(' ');
        notifySpeaking(song);
        setHistory((h) => [...h, { role: 'assistant', content: song }]);
      }
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
    const quota = checkChatTurnQuota();
    if (!quota.ok) {
      const line = quotaExceededCopy(lang);
      setHistory((h) => [...h, { role: 'assistant', content: line }]);
      sayLocal(line, { sadness: 0.2 });
      done();
      return;
    }
    consumeChatTurn();
    // Sing / dance start the premade clip NOW, before the reply arrives, so
    // the track is audible and named while she thinks. A sing request skips
    // the thinking filler — the clip is the vocal.
    const requested = detectMove(text);
    // Sing/dance: moves + procedural clip now; ask taste when vague — streaming
    // URL hook is resolveStreamPlaylist() in lib/music (follow-up).
    if (requested === 'sing' || requested === 'dance') {
      triggerMove(requested);
      applyLlmHints({ joy: requested === 'sing' ? 0.88 : 0.72 });
      beginShow(requested === 'sing' ? 'song' : 'dance', 18_000, felt?.mood);
    }
    setThinkingPose(true);
    pushAutoIdle('', undefined, true);
    // t790 — the wait cue is HER OWN TTS voice, silent until the reply has
    // been loading for about a second, then two full "let me think" lines. The
    // same beat paints the placeholder bubble, so screen and speaker agree.
    // A sing or dance ask already has a premade clip as the wait audio.
    if (requested !== 'sing' && requested !== 'dance') {
      speakThinkingFiller(characterId, lang, felt?.mood, text, (line) => {
        if (!transientRef.current) return;
        setHistory((h) => {
          const last = h.length - 1;
          const tail = h[last];
          if (!tail || tail.role !== 'assistant') return h;
          return [...h.slice(0, last), { ...tail, content: line }];
        });
        notifySpeaking(line);
      });
    }
    // r.47 — ONE transient placeholder bubble carries the whole wait. It
    // starts as '…' and takes the wait beats above. The first stream token
    // takes the bubble over, and the final reply commits in its place.
    setHistory((h) => [...h, { role: 'assistant', content: '…' }]);
    transientRef.current = true;
    // learn from the user's words, then inject what she remembers into her prompt
    onMemCountRef.current?.(memorySummaryCount(rememberExchange(text)));
    // r125 — pass the user's words so OLD on-topic memories surface too
    const memoryBuilt = buildMemoryBlock(lang, undefined, text);
    const memory = memoryBuilt?.block;
    const turnMemoryUsed = memoryBuilt?.used ?? [];
    // one exit path for every outcome: the final reply (or the failure note)
    // takes the placeholder's place instead of stacking a second bubble
    const commitReply = (content: string) => {
      stopMusic(); // r.48 — the show ends the moment her real reply lands
      // r86 — a live sing/duet/piano performance survives this stopMusic()
      // (the performance layer preserves it); a plain dance bed still ends
      const replace = transientRef.current;
      transientRef.current = false;
      setStreamDraft('');
      const memStrip = turnMemoryUsed.length > 0 ? turnMemoryUsed : undefined;
      setHistory((h) => {
        const tail = h[h.length - 1];
        if (replace && tail?.role === 'assistant') {
          return [...h.slice(0, -1), { role: 'assistant', content, memoryUsed: memStrip }];
        }
        return [...h, { role: 'assistant', content, memoryUsed: memStrip }];
      });
    };
    // r70 — persona + adaptive block (scene + warmth calibration)
    const personaForBrain = fullPersona();
    // Weather, local news, and web lookups run before either brain so the
    // reply can use live facts. Ordinary chat plans no tools and returns
    // immediately, without a location prompt.
    let world = '';
    let worldSpoken = '';
    let answered = false;
    try {
      const priorUser = [...history].reverse().find((m) => m.role === 'user')?.content;
      const live = await clientLiveContext(text, lang, priorUser);
      world = live.prompt;
      worldSpoken = live.spoken;
      const livePlan = planTools(text, priorUser);
      if (isLiveFactsOnlyTurn(livePlan, worldSpoken)) {
        stopThinkingSound();
        const line = withQuestion(worldSpoken, lang);
        rememberTurn(text, line);
        onMemCountRef.current?.(memorySummaryCount());
        feedUtterance(line);
        if (feltHints) applyLlmHints(feltHints);
        notifySpeaking(line);
        speak(line, characterId, lang, feltHints, undefined, felt?.intensity);
        pushAutoIdle(line, feltHints);
        commitReply(line);
        answered = true;
      }
    } catch { /* live lookup is best-effort — she still answers */ }
    // r97 — the first complete sentence of a streamed reply, spoken live the
    // moment it closes (see onPartial below); '' until then.
    // r100 — sentenceStamp is captured at that live-speak attempt, so the
    // final pass can tell "sound started" from "we tried and nothing came".
    let firstSentence = '';
    let sentenceStamp = 0;
    // r126 — browser-direct lane (static hosting / dead server): streams the
    // free keyless LLM straight from the browser. One shared closure so the
    // "server just failed" path and the "no server this session" path run
    // exactly the same code.
    const browserLane = async (): Promise<void> => {
      try {
        // stream the reply live into the placeholder bubble — first tokens
        // show up immediately instead of after the whole generation finishes
        const r = await clientChat([...history, { role: 'user', content: text }], {
          language: lang,
          persona: personaForBrain,
          memory,
          world,
          worldSpoken,
          onPartial: (partial) => {
            // r.47 — the real stream is painting now: the wait cue stands down
            stopThinkingSound();
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
            if (!firstSentence && requested !== 'sing') {
              const m = /^[^。！？.!?\n]+[。！？.!?]/.exec(clean);
              if (m) {
                firstSentence = m[0];
                sentenceStamp = Date.now();
                notifySpeaking(firstSentence);
                speak(firstSentence, characterId, lang, feltHints ?? { joy: 0.4, neutral: 0.3 }, undefined, felt?.intensity);
              }
            }
            setStreamDraft(clean || '');
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
        pushAutoIdle(r.reply, replyHints);
        commitReply(spoken);
        answered = true;
      } catch {
        // drop the placeholder only if nothing ever streamed; partial text stays
        setHistory((h) => {
          const tail = h[h.length - 1];
          return tail && tail.role === 'assistant' && tail.content === '…' ? h.slice(0, -1) : h;
        });
      }
    };

    const commitServer = (data: { reply?: string; emotionHints?: Record<string, number> }) => {
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
      pushAutoIdle(reply, replyHints);
      commitReply(spoken);
      answered = true;
    };
    try {
      if (!answered) {
        const payload = { message: text, history, persona: personaForBrain, memory, language: lang, world, worldSpoken };
        // Set only on a Node host. GitHub Pages leaves this empty, so the
        // static demo still uses /api/chat (absent) and then the browser lane.
        const produced = await productionChat(payload);
        if (produced) {
          commitServer(produced);
        } else if (shouldSkipServerProbe()) {
          // r126 — this session already learned there's no /api/chat (static
          // host): skip the dead round-trip, go straight to the browser lane
          await browserLane();
        } else {
          try {
            const res = await fetch(assetUrl('/api/chat'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json() as { reply?: string; emotionHints?: Record<string, number> };
            commitServer(data);
          } catch {
            // no server (e.g. static GitHub Pages build) — remember it for the
            // rest of the session, then free keyless LLM from the browser
            markNoApiRoute();
            await browserLane();
          }
        }
      }
    } finally {
      stopThinkingSound(); // reply (or failure) is here — stop the wait cue
      setThinkingPose(false);
      stopMusic(); // r.48 — belt-and-braces: no PLAIN music outlives the turn
      // r86 — a live sing/duet/piano performance survives this stopMusic();
      // it ends on its own performance timer or the next user interrupt
      if (!answered) {
        const hiccup = '… (connection hiccup — I’m still here)';
        commitReply(hiccup);
        pushAutoIdle(hiccup);
      }
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
  const endVoiceMode = () => {
    if (!micModeRef.current) return;
    micModeRef.current = false;
    micStopRef.current?.stop();
    micStopRef.current = null;
    if (vadGraceRef.current) { clearTimeout(vadGraceRef.current); vadGraceRef.current = null; }
    vadStopRef.current?.stop();
    vadStopRef.current = null;
    setUserSpeaking(false);
    listeningRef.current = false;
    setListening(false);
    setMicDismissed(true);
    setLiveText('');
    lastActivityRef.current = Date.now();
    lastUserRef.current = Date.now();
    reengageStageRef.current = 0;
  };

  const beginVoiceMode = (opts?: { cutCompanion?: boolean }) => {
    if (micModeRef.current) return;
    if (!listenSupported()) {
      window.alert(t(lang, 'micUnsupported'));
      return;
    }
    enterVoiceChatAudioSession();
    duckExternalAudioForCompanion();
    micModeRef.current = true;
    listeningRef.current = true;
    setListening(true);
    setMicDismissed(false);
    // Auto-open on chat enter must not cancel the first reply still loading on gTTS.
    if (opts?.cutCompanion !== false) stopSpeaking();
    let bargeInArmed = true; // first real speech of a burst cuts her off
    const micHandle = listenContinuous(lang, {
      // r87 — the VAD owns endpointing now; its onPartial flushes via handle
      externalEndpoint: true,
      onSpeechStart: () => {
        if (!bargeInArmed) return;
        bargeInArmed = false;
        stopSpeaking(); // the user is really talking — cut her voice NOW
        endPerformanceMusic();
        showTrack(null);
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
        setMicDismissed(true);
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
        // Silero hears raw mic frames — her own TTS from the speakers trips
        // "speech" and used to call stopSpeaking() on every reply after mic
        // open. Leave barge-in to Web Speech onSpeechStart (recognized words
        // only). VAD still owns UI + endpointing.
        if (bargeInArmed && !isSpeaking() && !speechPending()) {
          bargeInArmed = false;
          stopSpeaking();
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

  const mic = () => {
    if (micModeRef.current) endVoiceMode();
    else beginVoiceMode();
  };

  // Grok-style: mic opens as soon as you enter chat; OS / Audio Session ducks other apps.
  useEffect(() => {
    enterVoiceChatAudioSession();
    pauseForeignPageMedia();
    if (micAutoArmedRef.current) return;
    if (!listenSupported()) return;
    const preflight = micPreflightGrantedThisSession();
    if (!preflight) {
      const rec = getEntryGateRecord();
      if (rec?.mic === 'denied' || rec?.mic === 'unsupported') return;
    }
    micAutoArmedRef.current = true;
    const micDelay = preflight
      ? 0
      : shouldPlayOpenCheer(characterId)
        ? OPEN_CHEER_MS + 300
        : 400;
    const t0 = window.setTimeout(() => {
      if (!micModeRef.current) beginVoiceMode({ cutCompanion: false });
    }, micDelay);
    return () => clearTimeout(t0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, characterId]);

  useEffect(() => subscribeMiniGameOpen(beginActionGame), [beginActionGame]);
  useEffect(() => {
    setMiniGameChromeHidden(actionGame != null);
    return () => setMiniGameChromeHidden(false);
  }, [actionGame]);

  // Title screen and play replace the chat room: no history, no mic orb, no input.
  if (actionGame) {
    return (
      <MiniGameOverlay
        key={actionGame}
        kind={actionGame}
        lang={lang}
        onEmotion={(ev) => applyLlmHints(ev.hints)}
        onExit={(result) => {
          actionGameRef.current = false;
          setActionGame(null);
          sayLocal(result.line, result.hints);
        }}
      />
    );
  }

  return (
    <div className="pointer-events-auto relative mx-auto flex w-full max-w-2xl flex-col items-center gap-1.5 px-4 pb-4">
      {/* boxless history — fully opaque messages; only the on-screen height
          fades (bottom line 100%, each line a step dimmer). Scrolling an
          old line DOWN into the bright zone makes it crisp and readable. */}
      <div
        ref={scrollRef}
        data-testid="chat-history-scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          nearBottomRef.current = atBottom;
          setPinnedBottom(atBottom);
        }}
        className="pointer-events-auto w-full touch-pan-y space-y-2.5 overflow-y-auto overscroll-contain px-2 pb-1 pt-6 [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_22%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.6)_56%,rgba(0,0,0,0.8)_72%,black_90%)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_22%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.6)_56%,rgba(0,0,0,0.8)_72%,black_90%)]"
        style={{ maxHeight: '17vh' }}
      >
        {history.length === 0 && <p className="text-center text-white/40">{t(lang, 'sayHi', { name: characterName })}</p>}
        {history.map((m, i) => {
          const tailAssistant =
            m.role === 'assistant' &&
            i === history.length - 1 &&
            pinnedBottom;
          const streamingTail =
            tailAssistant &&
            (speakingNow
              || (busy && streamDraft.trim().length > 0)
              || speechCaption.trim().length > 0) &&
            m.content.trim() !== '';
          const liveClause = streamingTail
            ? (speechCaption.trim() || (streamDraft.trim() ? rollingCaptionFromText(streamDraft) : ''))
            : '';
          return (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              tailStreaming={streamingTail}
              liveClause={liveClause || undefined}
              lang={lang}
              accent={accent}
              label={m.role === 'assistant' && i === history.length - 1 ? characterName : undefined}
              memoryUsed={m.memoryUsed}
              onForgetMemory={(id) => {
                forgetInjectedMemory(id);
                onMemCountRef.current?.(memorySummaryCount());
                setHistory((prev) => prev.map((row, idx) => (
                  idx === i && row.memoryUsed
                    ? {
                      ...row,
                      memoryUsed: row.memoryUsed.filter((u) => u.id !== id),
                    }
                    : row
                )));
              }}
              onReport={(reply) => setReportFor(reply)}
            />
          );
        })}
        {/* r81 — the words you're speaking RIGHT NOW: italic + slightly dimmed
            in your accent colour, replaced by the committed message the
            instant the ~1s silence endpoint sends it, exactly like ChatGPT. */}
        {liveText.trim() && (
          <div className="text-right">
            <p className="select-text italic opacity-75" style={{ color: accent }}>{liveText}</p>
          </div>
        )}
        {busy && <p className="text-white/40">{t(lang, 'typing', { name: characterName })}</p>}
        {/* Crisis guard fired on the last turn: the fixed reply is above, and
            this card carries the tap-through to the helplines. It stays until
            the next message so it cannot be missed by a scroll. */}
        {crisisCard && (
          <div
            data-testid="crisis-card"
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-left"
          >
            <p className="text-xs font-semibold text-rose-50">{t(lang, 'safetyCrisisTitle')}</p>
            <Link
              href="/setup#setup-safety-heading"
              className="mt-1 inline-block text-xs text-pink-200 underline-offset-4 hover:underline"
            >
              {t(lang, 'safetyOpenPage')}
            </Link>
          </div>
        )}
      </div>

      {/* input row — ChatGPT-style hero mic with the living emotion orb.
          r136: z-10 — the lower-third scroll pad below is absolute + z-0 and
          renders AFTER this row; at equal stacking level the later DOM node
          wins, so the pad used to paint over and swallow every tap on the
          mic and the text field. z-10 puts the row back on top. */}
      {nowPlaying && (
        <div
          data-now-playing={nowPlaying}
          data-clip-state={clipState ?? 'starting'}
          className="pointer-events-none z-20 flex items-center gap-1.5 self-start rounded-full border border-white/20 bg-black/80 px-3 py-1 text-xs font-medium text-white shadow-[0_8px_24px_-10px_rgba(0,0,0,0.9)]"
        >
          <span aria-hidden>♪</span>
          <span>{nowPlaying.replace(/^♪\s*/, '')}</span>
        </div>
      )}
      <div className="relative z-10 flex w-full items-center gap-2.5">
        {/* r119: the voice watchdog armed a replay — a silent line is waiting
            for ANY tap to be re-spoken. Floating chip above the mic;
            pointer-events-none so the tap falls straight through to the
            window pointerdown that performs the replay. */}
        {replayHint && (
          <div className="pointer-events-none absolute -top-11 left-1 z-30 flex animate-bounce items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <span aria-hidden>🔇</span>
            <span>{t(lang, 'replayHint')}</span>
          </div>
        )}
        {/* r84: NO backdrop-filter on this button. WebKit frosts the whole
            RECTANGULAR border-box of a backdrop-filter element no matter the
            border-radius (r62's overflow:hidden only cured some iOS builds),
            which was the persistent "square behind the circle". Solid
            bg-black/55 keeps the same readability with zero blur — nothing
            rectangular is rendered at all. */}
        <button
          type="button"
          onClick={() => mic()}
          title={listening ? t(lang, 'micTitle') : micDismissed ? t(lang, 'micOff') : t(lang, 'micTitle')}
          aria-label={listening ? t(lang, 'micTitle') : micDismissed ? t(lang, 'micOff') : t(lang, 'micTitle')}
          aria-pressed={listening}
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
                : micDismissed
                  ? {
                      // voice mode OFF — muted ring, unmistakable idle mic
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -12px rgba(0,0,0,0.85)',
                    }
                  : {
                      // pre-open idle — a faint circular ring only (inset shadows follow
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
          {/* live = soft emotion orb; dismissed = crossed mic; else invite mic */}
          {(listening || speakingNow) && <EmotionOrb size={72} accent={accent} listening={listening} userSpeaking={userSpeaking} />}
          {!listening && !speakingNow && micDismissed && (
            <svg
              data-testid="hero-mic-off"
              viewBox="0 0 24 24"
              className="pointer-events-none h-7 w-7 text-white/45"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 15.2a3.7 3.7 0 0 0 3.7-3.7V6.6a3.7 3.7 0 1 0-7.4 0v4.9a3.7 3.7 0 0 0 3.7 3.7Z"
                fill="currentColor"
              />
              <path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M12 18v3.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M4.2 4.2l15.6 15.6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          )}
          {!listening && !speakingNow && !micDismissed && (
            <svg
              data-testid="hero-mic-idle"
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
          id="amoji-chat-composer"
          name="message"
          autoComplete="off"
          aria-label={t(lang, 'sayHi', { name: characterName })}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={t(lang, 'sayHi', { name: characterName })}
          className="h-11 flex-1 overflow-hidden rounded-full border border-white/10 bg-black/30 px-4 text-[15px] text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-white/40"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition disabled:opacity-40"
          style={{ backgroundColor: accent }}
          aria-label={t(lang, 'sendBtn')}
        >
          ➤
        </button>
      </div>
      {/* Play requirement: an in-app route to report generated content. Kept
          outside the scroll area so opening it cannot scroll the history. */}
      {reportFor !== null && (
        <ReportDialog
          reply={reportFor}
          lang={lang}
          accent={accent}
          characterId={characterId}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}
