import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_STORAGE_KEYS, wipeClientProductData } from '../lib/client-storage';
import { FILE_LOCATIONS, FREE_SERVERS, systemsSnapshot } from '../lib/systems-catalog';
import { autoReply } from '../lib/auto-reply';
import { planStatus, paymentsConfigured, setPlusPlanLocal, clearPlusPlanLocal } from '../lib/billing';
import { securityFacts } from '../lib/security-policy';
import { cookiesDoc } from '../lib/legal-copy';
import { LEGAL_ACCEPT_VERSION } from '../lib/legal-accept';
import { LANGS, type Lang } from '../lib/prefs';

const web = join(__dirname, '..');

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    clear: vi.fn(() => { store.clear(); }),
    store,
  };
  vi.stubGlobal('localStorage', ls);
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), localStorage: ls });
  return ls;
}

describe('systems pack', () => {
  beforeEach(() => {
    mockLocalStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists free servers and file locations', () => {
    expect(FREE_SERVERS.length).toBeGreaterThanOrEqual(5);
    expect(FILE_LOCATIONS.some((f) => f.id === 'sqlite')).toBe(true);
    expect(systemsSnapshot().productionApi).toBe(false);
  });

  it('inventories client storage keys', () => {
    expect(CLIENT_STORAGE_KEYS.some((k) => k.key === 'amoji.prefs.v1')).toBe(true);
    expect(CLIENT_STORAGE_KEYS.some((k) => k.key === 'amoji.legalAccept.v1')).toBe(true);
  });

  it('ships multi-lang auto-reply templates', () => {
    for (const { id } of LANGS) {
      const ack = autoReply('reportAck', id as Lang);
      expect(ack.subject.length).toBeGreaterThan(5);
      expect(ack.body.toLowerCase()).toMatch(/crisis|危機|危机|緊急|helpline|求助|相談/);
    }
  });

  it('exposes security facts without inventing tracking', () => {
    const blob = securityFacts().map((f) => `${f.title} ${f.detail}`).join(' ');
    expect(blob).toMatch(/analytics|tracking/i);
    expect(blob.toLowerCase()).toMatch(/self-harm|crisis/);
  });

  it('cookies policy exists in every language', () => {
    for (const { id } of LANGS) {
      const doc = cookiesDoc(id as Lang);
      expect(doc.title.length).toBeGreaterThan(3);
      expect(doc.sections.length).toBeGreaterThanOrEqual(2);
      expect(doc.sections.flatMap((s) => s.body).join(' ')).not.toMatch(/placeholder/i);
    }
  });

  it('bumped legal accept for systems/legal refresh', () => {
    expect(LEGAL_ACCEPT_VERSION).toBe(3);
  });

  it('Plus plan bypasses the free chat gate', () => {
    clearPlusPlanLocal();
    expect(planStatus().plan).toBe('free');
    setPlusPlanLocal();
    expect(planStatus().plan).toBe('plus');
    expect(planStatus().chatAllowed).toBe(true);
    clearPlusPlanLocal();
  });

  it('payments stay off without a public Stripe link', () => {
    expect(paymentsConfigured()).toBe(false);
  });

  it('Settings sheet links plan, systems, and legal', () => {
    const src = readFileSync(join(web, 'components/SettingsSheet.tsx'), 'utf8');
    expect(src).toContain('settingsPlan');
    expect(src).toContain('settingsSystems');
    expect(src).toContain('settingsLegal');
    expect(src).toContain('href="/cookies"');
    expect(src).toContain('href="/systems"');
    expect(src).toContain('syncEntitlementFromApi');
  });

  it('cookies and systems pages expose a localized back control', () => {
    for (const rel of ['app/cookies/page.tsx', 'app/systems/page.tsx'] as const) {
      const src = readFileSync(join(web, rel), 'utf8');
      expect(src).toContain("aria-label={t(lang, 'back')}");
    }
  });

  it('ReportDialog best-effort posts to the production API', () => {
    const src = readFileSync(join(web, 'components/ReportDialog.tsx'), 'utf8');
    expect(src).toContain('submitReportRemote');
  });

  it('docs SYSTEMS map is present', () => {
    const doc = readFileSync(join(web, '../../docs/SYSTEMS.md'), 'utf8');
    expect(doc).toContain('Payment');
    expect(doc).toContain('Email');
    expect(doc).toContain('GitHub Pages');
  });

  it('wipe helper can keep legal acceptance', () => {
    localStorage.setItem('amoji.prefs.v1', '{}');
    localStorage.setItem('amoji.legalAccept.v1', '{"version":3,"acceptedAt":"2026-01-01T00:00:00.000Z"}');
    const removed = wipeClientProductData({ keepLegal: true });
    expect(removed).toContain('amoji.prefs.v1');
    expect(localStorage.getItem('amoji.legalAccept.v1')).toBeTruthy();
    localStorage.clear();
  });
});
