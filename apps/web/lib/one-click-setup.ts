'use client';
/**
 * One tap: accept terms, 18+ record, audio/mic probes, ready for /select.
 * Called from the title START and from QuickSetup. Never blocks the UI long —
 * voice sample and mic run with a short cap; chat still works if they fail.
 */
import { acceptCurrentLegal, hasAcceptedCurrentLegal } from './legal-accept';
import { passEntryGate, type MicOutcome } from './entry-gate';
import { loadPrefs, type Lang } from './prefs';
import { saveProfile, loadProfile } from './profile';
import { ensureUserNameFromProfile } from './memory';
import { isMasterMuted, setMasterMuted } from './master-mute';
import { listenSupported } from './listen';
import { primeAudioForChatEnter, testVoiceChain } from './voice';

async function requestMic(): Promise<MicOutcome> {
  if (!listenSupported()) return 'unsupported';
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return 'unsupported';
  try {
    const stream = await md.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}

async function voiceSampleOk(characterId: string, lang: Lang, ms: number): Promise<boolean> {
  try {
    await Promise.race([
      testVoiceChain(characterId, lang),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export interface OneClickSetupOpts {
  lang?: Lang;
  /** Optional display name; empty is fine */
  name?: string;
}

/**
 * Returns whether voice sample likely played (best-effort; never claimed as proof).
 */
export async function oneClickBootstrap(opts: OneClickSetupOpts = {}): Promise<{ voiceOk: boolean }> {
  if (!hasAcceptedCurrentLegal()) acceptCurrentLegal();

  try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
  try { primeAudioForChatEnter(); } catch { /* ignore */ }

  const lang = opts.lang ?? loadPrefs().lang;
  const name = opts.name ?? loadProfile().name ?? '';
  saveProfile({ name });
  ensureUserNameFromProfile(name);

  let characterId = 'a01-shino';
  try { characterId = loadPrefs().character; } catch { /* default */ }

  const [mic, voiceOk] = await Promise.all([
    requestMic(),
    voiceSampleOk(characterId, lang, 12_000),
  ]);

  passEntryGate({
    adultAcknowledgedAt: new Date().toISOString(),
    audioHeard: voiceOk ? 'yes' : 'no',
    mic,
  });

  return { voiceOk };
}
