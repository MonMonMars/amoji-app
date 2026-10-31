/** Chat-room open phase (t794) + session-gap re-open (t796).
 *
 * Phase 1 — first open / fresh session: character cheer-up, then auto
 * weather and/or light news only while the user is still silent.
 * Phase 2 — after the user speaks: stay on their topic; auto weather/news
 * only when they go idle again (never injected over an active turn).
 *
 * Session gap: leaving the chat room for OPEN_SESSION_GAP_MS (default 2.5h,
 * mid of Mon's ~2–3h) starts a NEW open phase — fresh cheer-up, cleared
 * chat history, no resume of the prior thread as continuous.
 */
import { cleanForSpeech } from './speak-text';

/** Mid of Mon's ~2–3h gap. Override in tests via isFreshOpenPhase(..., gapMs). */
export const OPEN_SESSION_GAP_MS = 2.5 * 60 * 60 * 1000;

export const OPEN_PHASE_KEY = 'amoji.openPhase.v1';

/** Cheer opener timing (matches prior cannedOpener delay). */
export const OPEN_CHEER_MS = 1_200;
/** Second cheer / daily check-in line. */
export const OPEN_CHEER_FOLLOW_MS = 5_200;
/** Auto weather + light news if the user is still silent after cheer. */
export const OPEN_IDLE_BRIEF_MS = 9_500;

export interface OpenPhaseState {
  lastClosedAt?: number;
  lastOpenedAt?: number;
  /** Wall clock when the open-phase idle weather/news brief last spoke. */
  idleBriefAt?: number;
}

function readStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadOpenPhaseState(): OpenPhaseState {
  const store = readStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(OPEN_PHASE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<OpenPhaseState>;
    return {
      lastClosedAt: typeof p.lastClosedAt === 'number' ? p.lastClosedAt : undefined,
      lastOpenedAt: typeof p.lastOpenedAt === 'number' ? p.lastOpenedAt : undefined,
      idleBriefAt: typeof p.idleBriefAt === 'number' ? p.idleBriefAt : undefined,
    };
  } catch {
    return {};
  }
}

export function saveOpenPhaseState(patch: Partial<OpenPhaseState>): OpenPhaseState {
  const next = { ...loadOpenPhaseState(), ...patch };
  const store = readStorage();
  if (store) {
    try {
      store.setItem(OPEN_PHASE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }
  return next;
}

/**
 * True when there is no prior open/close stamp, or the last chat-room close
 * (falling back to last open) is at least `gapMs` ago.
 */
export function isFreshOpenPhase(now = Date.now(), gapMs = OPEN_SESSION_GAP_MS): boolean {
  const { lastClosedAt, lastOpenedAt } = loadOpenPhaseState();
  const anchor = lastClosedAt ?? lastOpenedAt;
  if (anchor == null) return true;
  return now - anchor >= gapMs;
}

export function markChatRoomOpened(now = Date.now()): OpenPhaseState {
  return saveOpenPhaseState({ lastOpenedAt: now });
}

export function markChatRoomClosed(now = Date.now()): OpenPhaseState {
  return saveOpenPhaseState({ lastClosedAt: now });
}

export function markOpenIdleBriefDone(now = Date.now()): OpenPhaseState {
  return saveOpenPhaseState({ idleBriefAt: now });
}

/** Skip repeating the open idle brief on a within-gap remount this stretch. */
export function openIdleBriefAlreadyDone(): boolean {
  const s = loadOpenPhaseState();
  if (s.idleBriefAt == null || s.lastOpenedAt == null) return false;
  return s.idleBriefAt >= s.lastOpenedAt;
}

/** planTools-friendly weather ask (same phrasing as showcase accept). */
export function openPhaseWeatherAsk(lang: string): string {
  if (lang === 'ja') return '今日の天気は？';
  if (lang === 'zh') return '今天天气怎么样？';
  if (lang === 'yue') return '今日天氣點呀？';
  return "what's the weather here?";
}

/** Light / cheerful news ask — heavy topics stay opt-in (#57). */
export function openPhaseNewsAsk(lang: string): string {
  if (lang === 'ja') return '明るいニュースある？';
  if (lang === 'zh') return '有什么轻松的新闻？';
  if (lang === 'yue') return '有咩輕鬆新聞？';
  return 'any light cheerful news?';
}

/** Join spoken snippets for TTS; strip hashtags/symbols via cleanForSpeech. */
export function summarizeOpenPhaseSpoken(...parts: Array<string | undefined | null>): string {
  const joined = parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p) => p.trim())
    .join(' ')
    .trim();
  if (!joined) return '';
  return cleanForSpeech(joined);
}
