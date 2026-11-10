import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { LEGAL_ACCEPT_VERSION, LEGAL_ACCEPT_KEY } from '../lib/legal-accept';
import { PRIVACY_DOC, TERMS_DOC, privacySummary, termsSummary } from '../lib/legal-copy';
import { LANGS, STRINGS, t, type Lang, type StrKey } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

/** Every user-facing legal surface. */
const LEGAL_FILES = [
  'components/LegalGate.tsx',
  'components/setup-one-shared.tsx',
  'lib/legal-copy.ts',
  'lib/legal-accept.ts',
] as const;

describe('placeholder legal copy is gone', () => {
  // The exact wording the review objected to. "demo" is allowed ONLY where it
  // is not a legal disclaimer — nothing in these files qualifies, so the scan
  // is a plain case-insensitive search over the file text.
  const BANNED = [/\(demo\)/i, /（示範）/i, /（演示）/i, /（デモ）/i, /not final/i, /placeholder/i, /演示摘要/i, /示範摘要/i];

  /** Comments are not shipped copy, so the scan reads code text only. */
  const stripComments = (src: string) =>
    src.split('\n').filter((line) => {
      const t = line.trim();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'));
    }).join('\n');

  for (const rel of LEGAL_FILES) {
    it(`${rel} contains no placeholder/demo disclaimer`, () => {
      const src = stripComments(read(rel));
      const hits: string[] = [];
      for (const re of BANNED) {
        const m = re.exec(src);
        if (m) hits.push(`${re} → "${m[0]}"`);
      }
      expect(hits).toEqual([]);
    });
  }

  it('the whole shipped legal table is clean, every language', () => {
    const docs = [...Object.values(PRIVACY_DOC), ...Object.values(TERMS_DOC)];
    for (const doc of docs) {
      const all = [doc.title, doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.body])].join('\n');
      expect(all).not.toMatch(/\bdemo\b/i);
      expect(all).not.toMatch(/placeholder/i);
      expect(all).not.toMatch(/示範|演示|デモ/);
      expect(all).not.toMatch(/not final/i);
    }
  });
});

describe('legal copy names the real data recipients', () => {
  const RECIPIENTS = ['Pollinations', 'OVHcloud', 'Puter', 'Google Translate'];

  it('every language names all four recipients in the privacy doc', () => {
    for (const { id } of LANGS) {
      const doc = PRIVACY_DOC[id as Lang];
      const all = [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.body])].join('\n');
      for (const r of RECIPIENTS) expect(all).toContain(r);
    }
  });

  it('the gate summary names the recipients too, in every language', () => {
    for (const { id } of LANGS) {
      const body = privacySummary(id).body;
      for (const r of ['Pollinations', 'OVHcloud', 'Puter', 'Google Translate']) expect(body).toContain(r);
    }
  });

  it('states what does NOT leave the device', () => {
    for (const { id } of LANGS) {
      const all = PRIVACY_DOC[id as Lang].sections.map((s) => s.heading + ' ' + s.body.join(' ')).join(' ');
      // a "what stays here" / "does not do" section must exist
      expect(all).toMatch(/device|端末|本机|呢部機|this browser|呢個瀏覽器|このブラウザ/);
    }
  });

  it('inlines full safety copy in the unified setup scroll (no separate mini-pages)', () => {
    const shared = read('components/setup-one-shared.tsx');
    expect(shared).toContain('safetyHelplinesTitle');
    expect(shared).toContain('HelplineList');
    expect(shared).toContain('showHelplines');
    expect(read('app/privacy/page.tsx')).toContain('QuickSetup');
    expect(read('app/safety/page.tsx')).toContain('setup-safety-heading');
    expect(read('app/safety/page.tsx')).toContain('viewOnly');
  });
});

describe('legal copy is localized', () => {
  it('privacy and terms docs exist in all four languages with distinct intros', () => {
    const intros = LANGS.map(({ id }) => PRIVACY_DOC[id as Lang].intro);
    expect(new Set(intros).size).toBe(LANGS.length);
    const tIntros = LANGS.map(({ id }) => TERMS_DOC[id as Lang].intro);
    expect(new Set(tIntros).size).toBe(LANGS.length);
  });

  it('summary titles match the localized document titles', () => {
    for (const { id } of LANGS) {
      expect(privacySummary(id).title).toBe(PRIVACY_DOC[id as Lang].title);
      expect(termsSummary(id).title).toBe(TERMS_DOC[id as Lang].title);
    }
  });

  it('every doc has at least four substantive sections', () => {
    for (const { id } of LANGS) {
      expect(PRIVACY_DOC[id as Lang].sections.length).toBeGreaterThanOrEqual(4);
      expect(TERMS_DOC[id as Lang].sections.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('LEGAL_ACCEPT_VERSION bump forces re-consent', () => {
  it('is 2, not the original 1', () => {
    expect(LEGAL_ACCEPT_VERSION).toBe(3);
  });

  it('a stored v1 record no longer counts as accepted', async () => {
    const g = globalThis as { localStorage?: Storage; window?: Window & typeof globalThis };
    const prevLs = g.localStorage;
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

    const { hasAcceptedCurrentLegal, acceptCurrentLegal } = await import('../lib/legal-accept');
    // What a returning user actually has on disk from the previous release.
    map.set(LEGAL_ACCEPT_KEY, JSON.stringify({ version: 1, acceptedAt: '2026-01-01T00:00:00.000Z' }));
    expect(hasAcceptedCurrentLegal()).toBe(false);
    acceptCurrentLegal();
    expect(hasAcceptedCurrentLegal()).toBe(true);
    expect(JSON.parse(map.get(LEGAL_ACCEPT_KEY)!).version).toBe(LEGAL_ACCEPT_VERSION);

    g.localStorage = prevLs;
    if (prevWin === undefined) delete (g as { window?: unknown }).window;
    else g.window = prevWin;
  });
});

describe('new strings exist in all four languages', () => {
  const NEW_KEYS: StrKey[] = [
    'aiNotice', 'privacyTitle', 'termsTitle', 'policyVersion',
    'safetyCrisisLine', 'safetyCrisisTitle', 'safetyOpenPage', 'safetyHelplinesRulesHint',
    'safetyTitle', 'safetyLead', 'safetyHelplinesTitle', 'safetyEmergencyTitle',
    'safetyStepsTitle', 'safetyStepsBody', 'safetyAboutAi', 'safetyPrivacyLink',
  ];

  for (const key of NEW_KEYS) {
    it(`${key} is present and non-empty in en/yue/zh/ja`, () => {
      const row = STRINGS[key] as Record<string, string>;
      expect(row).toBeTruthy();
      for (const { id } of LANGS) {
        expect(typeof row[id]).toBe('string');
        expect(row[id]!.trim().length).toBeGreaterThan(0);
      }
    });
  }

  it('CJK variants of the new prose keys are really translated', () => {
    for (const key of NEW_KEYS) {
      const en = t('en', key);
      for (const id of ['yue', 'zh', 'ja'] as const) {
        expect(t(id, key)).not.toBe(en);
      }
    }
  });
});

describe('source scan: no placeholder legal text anywhere in the app', () => {
  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', '.next', 'out', 'tests'].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) sourceFiles(full, acc);
      else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
    }
    return acc;
  }

  it('LegalGate, privacy and terms carry no demo/placeholder/unfinished wording', () => {
    const offenders = sourceFiles(web)
      .filter((f) => /LegalGate|app[\\/](privacy|terms|safety)[\\/]|legal-(copy|accept)/.test(f))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return /Placeholder terms|not final lawyer|not final legal|\(demo\)|（示範）|（演示）|（デモ）/i.test(src);
      })
      .map((f) => f.slice(web.length + 1));
    expect(offenders).toEqual([]);
  });
});
