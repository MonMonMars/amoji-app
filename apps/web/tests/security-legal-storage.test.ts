import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLIENT_STORAGE_KEYS,
  CLIENT_STORAGE_PREFIXES,
  exportProductData,
  wipeClientProductData,
} from '../lib/client-storage';
import { RATE_LIMIT_RULES, ROUTE_AUTH_RULES, SECURITY_ENV, securityClientStatus } from '../lib/security-rules';
import { LEGAL_DOC_ROUTES, legalClientStatus } from '../lib/legal-rules';
import { LEGAL_ACCEPT_VERSION } from '../lib/legal-accept';
import { cookiesDoc } from '../lib/legal-copy';

const web = join(__dirname, '..');

function mockStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const make = (store: Map<string, string>) => ({
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    clear: vi.fn(() => { store.clear(); }),
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
    get length() { return store.size; },
    store,
  });
  const ls = make(local);
  const ss = make(session);
  vi.stubGlobal('localStorage', ls);
  vi.stubGlobal('sessionStorage', ss);
  vi.stubGlobal('window', {
    localStorage: ls,
    sessionStorage: ss,
    dispatchEvent: vi.fn(),
  });
  return { ls, ss, local, session };
}

describe('security / legal / storage finish', () => {
  beforeEach(() => {
    mockStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('documents rate limits and env without inventing a live connection', () => {
    expect(RATE_LIMIT_RULES.some((r) => r.id === 'global' && r.limit === 240)).toBe(true);
    expect(RATE_LIMIT_RULES.some((r) => r.id === 'support')).toBe(true);
    expect(SECURITY_ENV.some((e) => e.name === 'AMOJI_CORS_ORIGIN')).toBe(true);
    const status = securityClientStatus();
    expect(status.productionApi).toBe(false);
    expect(status.posture.toLowerCase()).toMatch(/no production api|on-device|pages/);
    expect(status.posture.toLowerCase()).not.toMatch(/\bconnected\b/);
  });

  it('lists route auth including storage wipe', () => {
    expect(ROUTE_AUTH_RULES.some((r) => r.path === '/api/storage/me' && r.auth === 'bearer')).toBe(true);
    expect(ROUTE_AUTH_RULES.some((r) => r.path === '/api/reports' && r.auth === 'optional-bearer')).toBe(true);
  });

  it('bumps legal accept to v4 and catalogues docs', () => {
    expect(LEGAL_ACCEPT_VERSION).toBe(4);
    expect(LEGAL_DOC_ROUTES.map((d) => d.id)).toEqual(
      expect.arrayContaining(['privacy', 'terms', 'cookies', 'safety', 'credits']),
    );
    const status = legalClientStatus();
    expect(status.accepted).toBe(false);
    expect(status.currentAcceptVersion).toBe(4);
  });

  it('cookies copy names export/wipe', () => {
    const en = cookiesDoc('en').sections.flatMap((s) => s.body).join(' ');
    expect(en.toLowerCase()).toMatch(/export/);
    expect(en.toLowerCase()).toMatch(/wipe|clear/);
  });

  it('inventories storage keys including sensitive BYOK prefixes', () => {
    expect(CLIENT_STORAGE_KEYS.some((k) => k.key === 'amoji.prefs.v1')).toBe(true);
    expect(CLIENT_STORAGE_KEYS.some((k) => k.key === 'amoji.openai.key' && k.sensitive)).toBe(true);
    expect(CLIENT_STORAGE_PREFIXES.some((p) => p.prefix === 'amoji.brain.key.' && p.sensitive)).toBe(true);
  });

  it('exports redacted secrets and can wipe while keeping legal', () => {
    localStorage.setItem('amoji.prefs.v1', '{"lang":"en"}');
    localStorage.setItem('amoji.backend.session', 'abc123');
    localStorage.setItem('amoji.brain.key.deepseek', 'sk-test');
    localStorage.setItem(
      'amoji.legalAccept.v1',
      JSON.stringify({ version: 4, acceptedAt: '2026-01-01T00:00:00.000Z' }),
    );
    const exported = exportProductData();
    const session = exported.keys.find((k) => k.key === 'amoji.backend.session');
    const brain = exported.keys.find((k) => k.key === 'amoji.brain.key.deepseek');
    expect(session?.value).toBe('[redacted]');
    expect(brain?.value).toBe('[redacted]');
    const removed = wipeClientProductData({ keepLegal: true });
    expect(removed).toContain('amoji.prefs.v1');
    expect(removed).toContain('amoji.backend.session');
    expect(removed).toContain('amoji.brain.key.deepseek');
    expect(localStorage.getItem('amoji.legalAccept.v1')).toBeTruthy();
  });

  it('Settings and systems pages wire export/wipe and posture', () => {
    const settings = readFileSync(join(web, 'components/SettingsSheet.tsx'), 'utf8');
    expect(settings).toContain('downloadProductDataExport');
    expect(settings).toContain('wipeClientProductData');
    expect(settings).toContain('wipeServerProductData');
    expect(settings).toContain('securityClientStatus');
    expect(settings).toContain('legalClientStatus');
    const systems = readFileSync(join(web, 'app/systems/page.tsx'), 'utf8');
    expect(systems).toContain('RATE_LIMIT_RULES');
    expect(systems).toContain('LEGAL_DOC_ROUTES');
    expect(systems).toContain('CLIENT_STORAGE_PREFIXES');
  });

  it('docs SYSTEMS map covers security/legal/storage finish', () => {
    const doc = readFileSync(join(web, '../../docs/SYSTEMS.md'), 'utf8');
    expect(doc).toContain('security-rules');
    expect(doc).toContain('/api/storage/me');
    expect(doc).toContain('LEGAL_ACCEPT_VERSION');
    expect(doc).toContain('AMOJI_CORS_ORIGIN');
  });
});
