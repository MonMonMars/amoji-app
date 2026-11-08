/** Chat-room open phase (t794) + session-gap re-open (t796) + Pixel entry flow.
 *
 * Phase 1 — first open / fresh session: hi + persona self-intro + what to
 * talk about; if still silent, 2–3 topic *suggestions* (no auto weather/news).
 * Phase 2 — user-driven chat; if they are idle / "don't know", companion
 * suggests topics (weather/news/story/etc. only when they pick or ask).
 *
 * Session gap: leaving the chat room for OPEN_SESSION_GAP_MS (default 2.5h,
 * mid of Mon's ~2–3h) starts a NEW open phase — fresh cheer-up, cleared
 * chat history, no resume of the prior thread as continuous.
 */
import { cleanForSpeech } from './speak-text';

/** Mid of Mon's ~2–3h gap. Override in tests via isFreshOpenPhase(..., gapMs). */
export const OPEN_SESSION_GAP_MS = 2.5 * 60 * 60 * 1000;

export const OPEN_PHASE_KEY = 'amoji.openPhase.v1';

/** Single short welcome line after chat enter (not stacked cheer + follow-up). */
export const OPEN_CHEER_MS = 2_800;
/** Legacy spacing constant — follow-up cheer disabled; mic delay may still reference it. */
export const OPEN_CHEER_FOLLOW_MS = OPEN_CHEER_MS;
/** Topic menu while still silent after the welcome (no live weather/news auto-play). */
export const OPEN_IDLE_BRIEF_MS = 12_000;

export interface OpenPhaseState {
  lastClosedAt?: number;
  lastOpenedAt?: number;
  /** Wall clock when the open-phase idle weather/news brief last spoke. */
  idleBriefAt?: number;
  /** Wall clock when open cheer (leading into name-hello) last spoke this stretch. */
  openCheerAt?: number;
  /** Companion id when open cheer last spoke (per-character welcome latch). */
  openCheerCharacterId?: string;
  /** Companion id when the open idle brief last spoke. */
  idleBriefCharacterId?: string;
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
      openCheerAt: typeof p.openCheerAt === 'number' ? p.openCheerAt : undefined,
      openCheerCharacterId: typeof p.openCheerCharacterId === 'string' ? p.openCheerCharacterId : undefined,
      idleBriefCharacterId: typeof p.idleBriefCharacterId === 'string' ? p.idleBriefCharacterId : undefined,
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

/** Skip repeating the open idle brief on a within-gap remount this stretch. */
export function openIdleBriefAlreadyDone(characterId?: string): boolean {
  const s = loadOpenPhaseState();
  if (s.idleBriefAt == null || s.lastOpenedAt == null) return false;
  if (
    characterId != null &&
    s.idleBriefCharacterId != null &&
    s.idleBriefCharacterId !== characterId
  ) {
    return false;
  }
  return s.idleBriefAt >= s.lastOpenedAt;
}
export function markOpenCheerDone(now = Date.now(), characterId?: string): OpenPhaseState {
  return saveOpenPhaseState({
    openCheerAt: now,
    ...(characterId != null ? { openCheerCharacterId: characterId } : {}),
  });
}

export function markOpenIdleBriefDone(now = Date.now(), characterId?: string): OpenPhaseState {
  return saveOpenPhaseState({
    idleBriefAt: now,
    ...(characterId != null ? { idleBriefCharacterId: characterId } : {}),
  });
}

/** Skip cheer + name-hello on within-gap remount after cheer already spoke.
 *  Call BEFORE markChatRoomOpened so lastOpenedAt is still the prior stretch. */
export function openCheerAlreadyDone(characterId?: string): boolean {
  const s = loadOpenPhaseState();
  if (s.openCheerAt == null || s.lastOpenedAt == null) return false;
  if (
    characterId != null &&
    s.openCheerCharacterId != null &&
    s.openCheerCharacterId !== characterId
  ) {
    return false;
  }
  return s.openCheerAt >= s.lastOpenedAt;
}

/** True when the entering chat should play open cheer for this companion. */
export function shouldPlayOpenCheer(characterId?: string, now = Date.now(), gapMs = OPEN_SESSION_GAP_MS): boolean {
  if (isFreshOpenPhase(now, gapMs)) return true;
  return !openCheerAlreadyDone(characterId);
}

/** planTools-friendly weather ask (same phrasing as showcase accept). */
export function openPhaseWeatherAsk(lang: string): string {
  if (lang === 'ja') return '今日の天気は？';
  if (lang === 'zh') return '今天天气怎么样？';
  if (lang === 'yue') return '今日天氣點呀？';
  return "what's the weather here?";
}

/** Light / cheerful news ask — heavy topics stay opt-in (#57); user-picked only. */
export function openPhaseNewsAsk(lang: string): string {
  if (lang === 'ja') return '明るいニュースある？';
  if (lang === 'zh') return '有什么轻松的新闻？';
  if (lang === 'yue') return '有咩輕鬆新聞？';
  return 'any light cheerful news?';
}

/** Standalone "what shall we talk about?" (persona intro may already ask). */
export function openPhaseTopicAsk(lang: string): string {
  if (lang === 'ja') return '今日は何を話したい？';
  if (lang === 'zh') return '今天想聊点什么呀？';
  if (lang === 'yue') return '今日想傾咩呀？';
  return 'what do you want to talk about today?';
}

/** Enter-chat TTS: optional name hello + persona self-intro (weather not first). */
export function buildOpenCheerLine(
  lang: string,
  opts: { nameHello?: string; personaIntro: string; topicAsk?: string },
): string {
  const L = ['yue', 'zh', 'ja', 'en'].includes(lang) ? lang : 'en';
  void L;
  const intro = opts.personaIntro.trim();
  const named = opts.nameHello?.trim();
  const ask = opts.topicAsk?.trim();
  const base = summarizeOpenPhaseSpoken(named, intro);
  if (!base) return summarizeOpenPhaseSpoken(ask) || ask || '';
  if (!ask) return base;
  const lower = base.toLowerCase();
  const askLower = ask.toLowerCase();
  if (lower.includes(askLower.slice(0, 12))) return base;
  return summarizeOpenPhaseSpoken(base, ask);
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
