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
    expect(gate).toContain('data-testid="legal-accept"');
    expect(gate).toContain('acceptCurrentLegal');
    expect(gate).toContain('hasAcceptedCurrentLegal');
    expect(gate).toContain('/privacy');
    expect(gate).toContain('/terms');
    expect(gate).toContain("LEGAL_DOC_PATHS");
    expect(gate).toContain("usePathname");
    expect(read('../app/privacy/page.tsx')).toContain('Privacy Policy');
    expect(read('../app/terms/page.tsx')).toContain('Terms of Use');
    expect(read('../lib/legal-accept.ts')).toContain('LEGAL_ACCEPT_VERSION');
  });
});

describe('select voice preview cut-through', () => {
  it('stops prior speech inside playVoiceGreeting and mutes previewEdgeVoice', () => {
    const voice = read('../lib/voice.ts');
    const greet = voice.indexOf('export function playVoiceGreeting');
    const preview = voice.indexOf('export function previewEdgeVoice');
    const greetSlice = voice.slice(greet, greet + 420);
    const previewSlice = voice.slice(preview, preview + 420);
    expect(greetSlice).toContain('stopSpeaking()');
    expect(greetSlice).toContain('voiceOutputAllowed()');
    expect(previewSlice).toContain('voiceOutputAllowed()');
    expect(previewSlice).toContain('stopSpeaking()');
    expect(read('../components/SelectionBoard.tsx')).toContain('playVoiceGreeting');
    expect(read('../components/TtsVoiceRow.tsx')).toContain('playVoiceGreeting');
  });
});
