import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(here, rel), 'utf8');

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage; window?: Window & typeof globalThis };
  const prev = g.localStorage;
  const prevWin = g.window;
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  g.localStorage = ls;
  g.window = {
    localStorage: ls,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window & typeof globalThis;
  return () => {
    g.localStorage = prev;
    if (prevWin === undefined) delete (g as { window?: unknown }).window;
    else g.window = prevWin;
  };
}

describe('legal-accept', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults to not accepted and persists versioned acceptance', async () => {
    const restore = swapLs();
    const m = await import('../lib/legal-accept');
    expect(m.hasAcceptedCurrentLegal()).toBe(false);
    m.acceptCurrentLegal();
    expect(m.hasAcceptedCurrentLegal()).toBe(true);
    const raw = JSON.parse(localStorage.getItem(m.LEGAL_ACCEPT_KEY)!);
    expect(raw.version).toBe(m.LEGAL_ACCEPT_VERSION);
    expect(typeof raw.acceptedAt).toBe('string');
    restore();
  });

  it('re-prompts when stored version lags LEGAL_ACCEPT_VERSION', async () => {
    const restore = swapLs();
    const m = await import('../lib/legal-accept');
    localStorage.setItem(
      m.LEGAL_ACCEPT_KEY,
      JSON.stringify({ version: m.LEGAL_ACCEPT_VERSION - 1, acceptedAt: '2020-01-01T00:00:00.000Z' }),
    );
    expect(m.hasAcceptedCurrentLegal()).toBe(false);
    m.acceptCurrentLegal();
    expect(m.hasAcceptedCurrentLegal()).toBe(true);
    restore();
  });

  it('wires a blocking LegalGate and privacy/terms routes', () => {
    const layout = read('../app/layout.tsx');
    const gate = read('../components/LegalGate.tsx');
    expect(layout).toContain('LegalGate');
    expect(gate).toContain('data-testid="legal-gate"');
    expect(gate).toContain('data-testid="legal-gate-boot"');
    expect(gate).toContain('data-testid="legal-accept"');
    // Boot blocker must paint before localStorage sync (no app chrome flash).
    expect(gate).toMatch(/if \(!ready\)[\s\S]*legal-gate-boot/);
    expect(gate).not.toMatch(/if \(!ready \|\| accepted[^\n]*\) return null/);
    expect(gate).toContain('acceptCurrentLegal');
    expect(gate).toContain('hasAcceptedCurrentLegal');
    expect(gate).toContain('/privacy');
    expect(gate).toContain('/terms');
    expect(gate).toContain("LEGAL_DOC_PATHS");
    expect(gate).toContain("usePathname");
    expect(read('../app/privacy/page.tsx')).toContain('privacyDoc');
    expect(read('../app/terms/page.tsx')).toContain('termsDoc');
    // Titles now live in one localized table (lib/legal-copy.ts) so the gate,
    // /privacy and /terms cannot drift apart; the docs still name themselves.
    expect(read('../lib/legal-copy.ts')).toContain('Privacy Policy');
    expect(read('../lib/legal-copy.ts')).toContain('Terms of Use');
    expect(read('../lib/legal-accept.ts')).toContain('LEGAL_ACCEPT_VERSION');
  });
});

describe('select voice preview cut-through', () => {
  it('stops prior speech inside the greeting and the preview', () => {
    const voice = read('../lib/voice.ts');
    const greet = voice.indexOf('export function playVoiceGreeting');
    const preview = voice.indexOf('export function previewVoiceChoice');
    const greetSlice = voice.slice(greet, greet + 420);
    const previewSlice = voice.slice(preview, preview + 420);
    expect(greetSlice).toContain('stopSpeaking()');
    expect(greetSlice).toContain('voiceOutputAllowed()');
    expect(previewSlice).toContain('voiceOutputAllowed()');
    expect(previewSlice).toContain('stopSpeaking()');
    expect(read('../components/SelectionBoard.tsx')).toContain('playVoiceGreeting');
    expect(read('../components/TtsVoiceRow.tsx')).toContain('playVoiceGreeting');
  });

  it('gates EmotionClipRow CMA previews on voiceOutputAllowed (mute-aware)', () => {
    const voice = read('../lib/voice.ts');
    const clip = voice.indexOf('export function previewLibraryClip');
    const clipSlice = voice.slice(clip, clip + 520);
    expect(clipSlice).toContain('voiceOutputAllowed()');
    expect(clipSlice).toContain('stopSpeaking()');
    expect(clipSlice.indexOf('voiceOutputAllowed()')).toBeLessThan(clipSlice.indexOf('stopSpeaking()'));
    const row = read('../components/EmotionClipRow.tsx');
    expect(row).toContain('voiceOutputAllowed()');
    expect(row).toContain('CMA_REACTION_GALLERY');
    expect(row).not.toContain('previewLibraryClip');
  });
});
