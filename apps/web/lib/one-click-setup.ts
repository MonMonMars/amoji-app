'use client';
/**
 * Rules confirm only: accept terms / 18+ scroll, seed profile.
 * Speaker + mic live on /gate/audio (soft gate) — never block this START on
 * voice or permission success. Loading must finish before the title page.
 */
import { acceptCurrentLegal, hasAcceptedCurrentLegal } from './legal-accept';
import { loadPrefs, type Lang } from './prefs';
import { saveProfile, loadProfile } from './profile';
import { ensureUserNameFromProfile } from './memory';
import { primeChatStartGesture } from './chat-start-gesture';

export interface OneClickSetupOpts {
  lang?: Lang;
  /** Optional display name; empty is fine */
  name?: string;
}

/**
 * Lightweight rules bootstrap. Returns immediately — no voice/mic wait.
 */
export async function oneClickBootstrap(opts: OneClickSetupOpts = {}): Promise<{ voiceOk: boolean }> {
  if (!hasAcceptedCurrentLegal()) acceptCurrentLegal();

  try { primeChatStartGesture(); } catch { /* ignore */ }

  const name = opts.name ?? loadProfile().name ?? '';
  saveProfile({ name });
  ensureUserNameFromProfile(name);

  // Touch prefs so lang/character defaults are hydrated before title/select.
  try { void loadPrefs(); } catch { /* ignore */ }
  void opts.lang;

  // Audio probe moved to PreChatAudioGate; always report soft-fail here so
  // callers that still read voiceOk do not treat rules START as proof of sound.
  return { voiceOk: false };
}
