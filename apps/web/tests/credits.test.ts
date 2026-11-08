import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CREDITS_COPY, FALLBACK_CREDIT, REQUIRED_CREDITS, creditsDoc,
} from '../lib/credits';
import { CHARACTERS, LANGS, STRINGS, t, type Lang } from '../lib/prefs';
import CreditsPage from '../app/credits/page';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

/** Ids whose embedded VRM licence requires credit (credit=necessary / required). */
const ATTRIBUTION_IDS = [
  'a10-agahomei-normal',
  'a64-lily-lily-animeit',
  'a79-amami-karasu',
  'a81-cinna',
  'a85-kara',
  'a98-ethan',
  'a99-miyora',
  'a107-dm-office-casual',
  'a109-riona',
  'a112-mahochan-jk',
] as const;

describe('credits table', () => {
  it('lists every attribution-required character in the shipping roster', () => {
    const listed = REQUIRED_CREDITS.map((e) => e.id).sort();
    expect(listed).toEqual([...ATTRIBUTION_IDS].sort());
    // Nothing listed that a user cannot pick any more.
    const roster = new Set(CHARACTERS.map((c) => c.id));
    for (const entry of REQUIRED_CREDITS) expect(roster.has(entry.id), entry.id).toBe(true);
  });

  it('gives every entry a real credit, a licence and a licence URL', () => {
    for (const entry of [...REQUIRED_CREDITS, FALLBACK_CREDIT]) {
      expect(entry.work.trim().length, entry.id).toBeGreaterThan(0);
      expect(entry.by.trim().length, entry.id).toBeGreaterThan(2);
      expect(entry.license).toMatch(/CC BY|VRM Public License|VRoid Hub/);
      expect(entry.licenseUrl, entry.id).toMatch(/^https:\/\//);
    }
  });

  it('reproduces the full three-line こうしす！ CC BY 4.0 credit', () => {
    const a10 = REQUIRED_CREDITS.find((e) => e.id === 'a10-agahomei-normal')!;
    expect(a10.by).toContain('京姫鉄道合同会社');
    expect(a10.by).toContain('佐久間蒼乃');
    expect(a10.by).toContain('OPAP-JP');
    expect(a10.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
    // The three parts must survive as separate lines, not be flattened away.
    expect(a10.extra).toHaveLength(3);
    expect(a10.extra!.join('\n')).toContain('©京姫鉄道合同会社');
    expect(a10.extra!.join('\n')).toContain('モデル制作: 佐久間蒼乃');
    expect(a10.extra!.join('\n')).toContain('©OPAP-JP contributors');
  });

  it('credits all three authors of the three-author model', () => {
    const a107 = REQUIRED_CREDITS.find((e) => e.id === 'a107-dm-office-casual')!;
    for (const who of ['Mukto', 'Jessair', 'pixiv VRoid Project']) expect(a107.by).toContain(who);
  });

  it('lists seed-san, the fallback avatar every build redistributes', () => {
    expect(FALLBACK_CREDIT.by).toContain('VirtualCast');
    expect(FALLBACK_CREDIT.license).toContain('VRM Public License 1.0');
  });
});

describe('credits copy is localized', () => {
  it('exists in all four languages with distinct intros and titles per language', () => {
    for (const { id } of LANGS) {
      const doc = creditsDoc(id);
      expect(doc.title.trim().length, id).toBeGreaterThan(0);
      expect(doc.intro.trim().length, id).toBeGreaterThan(20);
    }
    // The gate/legal pattern: CJK locales must not fall back to the English text.
    const en = creditsDoc('en');
    for (const id of ['yue', 'zh', 'ja'] as const) {
      expect(creditsDoc(id).intro, id).not.toBe(en.intro);
      expect(creditsDoc(id).cc0Body, id).not.toBe(en.cc0Body);
    }
  });

  it('falls back to a shipped language, never undefined', () => {
    expect(creditsDoc('klingon').intro.length).toBeGreaterThan(20);
    expect(creditsDoc(undefined).intro.length).toBeGreaterThan(20);
  });

  it('creditsTitle resolves in every language through the shared string table', () => {
    const seen = new Set<string>();
    for (const { id } of LANGS) {
      const s = t(id as Lang, 'creditsTitle');
      expect(s.trim().length, id).toBeGreaterThan(0);
      seen.add(s);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(Object.keys(CREDITS_COPY).sort()).toEqual(LANGS.map(({ id }) => id).sort());
  });
});

describe('/credits page', () => {
  it('renders and names every attribution-required character plus seed-san', () => {
    const html = renderToStaticMarkup(createElement(CreditsPage));
    for (const id of ATTRIBUTION_IDS) {
      const entry = REQUIRED_CREDITS.find((e) => e.id === id)!;
      expect(html, id).toContain(entry.work);
      expect(html, id).toContain(entry.by);
    }
    expect(html).toContain('Seed-san');
    expect(html).toContain('VirtualCast');
  });

  it('names its own heading and links back home, like /privacy and /terms', () => {
    const html = renderToStaticMarkup(createElement(CreditsPage));
    expect(html).toContain('id="amoji-credits-title"');
    expect(html).toContain('aria-labelledby="amoji-credits-title"');
    expect(html).toContain('href="/"');
  });

  it('is reachable pre-consent via LegalGate LEGAL_DOC_PATHS', () => {
    expect(read('components/LegalGate.tsx')).toContain("'/credits'");
    expect(read('app/credits/page.tsx')).toContain('creditsDoc');
  });

  it('carries no placeholder or demo wording, same rule as the legal docs', () => {
    const src = read('app/credits/page.tsx') + read('lib/credits.ts');
    expect(src).not.toMatch(/\(demo\)|not final|placeholder/i);
    expect(src).not.toMatch(/示範|演示|デモ/);
  });

  it('the credits table is not an orphaned string in the table', () => {
    expect(STRINGS.creditsTitle.en).toBe('Credits');
  });
});
