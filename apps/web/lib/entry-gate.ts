'use client';
/**
 * First-run entry gate record: the 18+ acknowledgement and the audio check.
 *
 * WHY THIS IS A RECORD AND NOT A DETECTION
 * ----------------------------------------
 * There is no way to know that speechSynthesis actually produced sound.
 * `onstart` / `onend` fire normally on an iPhone whose hardware silent switch
 * is on — the engine "speaks" into a muted output — so every programmatic
 * signal this app could read would report success while the user hears
 * nothing. The same is true of a muted browser tab, a Bluetooth route and a
 * volume of zero. An automatic check would therefore be a lie in exactly the
 * case that matters.
 *
 * So the gate stores what the USER confirmed ("I heard her" / "I heard
 * nothing"), never what the app claims to have measured.
 *
 * `audioHeard` is a three-way judgement rather than a boolean because "heard
 * nothing, chose to continue anyway" is a different, honest outcome that the
 * app can act on later (the replay-hint chip) instead of pretending the audio
 * was verified.
 */

export type AudioHeard = 'yes' | 'no' | null;
export type MicOutcome = 'granted' | 'denied' | 'unsupported' | 'skipped';

export interface EntryGateRecord {
  version: number;
  /** ISO time the 18+ box was ticked */
  adultAcknowledgedAt: string;
  /** the user's own answer to "did you hear her?" — never a detection result */
  audioHeard: AudioHeard;
  audioCheckedAt: string | null;
  mic: MicOutcome;
}

/** Bump to re-prompt everyone (e.g. this screen's promises change). */
export const ENTRY_GATE_VERSION = 1;
export const ENTRY_GATE_KEY = 'amoji.entryGate.v1';
/** Set on /select START when getUserMedia succeeded in that gesture — chat mic opens with no delay. */
export const MIC_PREFLIGHT_SESSION_KEY = 'amoji.micPreflight.granted';
const EVENT = 'amoji:entry-gate';

function readRaw(): EntryGateRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ENTRY_GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EntryGateRecord>;
    if (typeof parsed.version !== 'number') return null;
    if (typeof parsed.adultAcknowledgedAt !== 'string') return null;
    const heard: AudioHeard =
      parsed.audioHeard === 'yes' || parsed.audioHeard === 'no' ? parsed.audioHeard : null;
    const mic: MicOutcome =
      parsed.mic === 'granted' || parsed.mic === 'denied' || parsed.mic === 'unsupported'
        ? parsed.mic
        : 'skipped';
    return {
      version: parsed.version,
      adultAcknowledgedAt: parsed.adultAcknowledgedAt,
      audioHeard: heard,
      audioCheckedAt: typeof parsed.audioCheckedAt === 'string' ? parsed.audioCheckedAt : null,
      mic,
    };
  } catch {
    return null;
  }
}

export function getEntryGateRecord(): EntryGateRecord | null {
  return readRaw();
}

export function setMicPreflightSession(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (granted) window.sessionStorage.setItem(MIC_PREFLIGHT_SESSION_KEY, '1');
    else window.sessionStorage.removeItem(MIC_PREFLIGHT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function micPreflightGrantedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MIC_PREFLIGHT_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Update mic field on an existing gate record (e.g. after /select START preflight). */
export function patchEntryGateMic(mic: MicOutcome): void {
  if (typeof window === 'undefined') return;
  const existing = readRaw();
  if (!existing) return;
  const rec: EntryGateRecord = { ...existing, mic };
  try {
    window.localStorage.setItem(ENTRY_GATE_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: rec }));
  } catch {
    /* ignore */
  }
}

/**
 * True only when the CURRENT gate version was completed — both the 18+
 * acknowledgement and the audio question were answered. Bumping
 * ENTRY_GATE_VERSION re-prompts every user, which is the point of versioning
 * it: changing this screen's promises must not silently reuse an old answer.
 */
export function hasPassedEntryGate(): boolean {
  const rec = readRaw();
  return !!rec && rec.version === ENTRY_GATE_VERSION && rec.audioHeard !== null;
}

/** Persist the user's answers. Called once, on the last step of the gate. */
export function passEntryGate(patch: {
  adultAcknowledgedAt?: string;
  audioHeard: Exclude<AudioHeard, null>;
  mic?: MicOutcome;
}): EntryGateRecord {
  const now = new Date().toISOString();
  const rec: EntryGateRecord = {
    version: ENTRY_GATE_VERSION,
    adultAcknowledgedAt: patch.adultAcknowledgedAt ?? now,
    audioHeard: patch.audioHeard,
    audioCheckedAt: now,
    mic: patch.mic ?? 'skipped',
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ENTRY_GATE_KEY, JSON.stringify(rec));
    } catch {
      /* ignore quota / private mode — the gate still closes for this session */
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: rec }));
    } catch {
      /* ignore */
    }
  }
  return rec;
}

/** Dev / test escape hatch: forget the gate so it runs again. */
export function resetEntryGate(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ENTRY_GATE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
  } catch {
    /* ignore */
  }
}

/** Same-tab + cross-tab subscription for the gate UI. */
export function subscribeEntryGate(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === ENTRY_GATE_KEY) cb();
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
