'use client';
/**
 * One tap: accept terms, 18+ record, audio/mic probes, ready for /select.
 * Called from the title START and from QuickSetup. Never blocks the UI long —
 * voice sample and mic run with a short cap; chat still works if they fail.
 */
import { acceptCurrentLegal, hasAcceptedCurrentLegal } from './legal-accept';
import { passEntryGate, setMicPreflightSession } from './entry-gate';
import { loadPrefs, type Lang } from './prefs';
import { saveProfile, loadProfile } from './profile';
import { ensureUserNameFromProfile } from './memory';
import { primeChatStartGesture } from './chat-start-gesture';
import { requestMic } from './mic-preflight';
import { testVoiceChain } from './voice';

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

  try { primeChatStartGesture(); } catch { /* ignore */ }

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
  if (mic === 'granted') setMicPreflightSession(true);

  return { voiceOk };
}
