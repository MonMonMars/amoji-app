import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const web = join(__dirname, '..');
const componentsDir = join(web, 'components');

/** Prose words that are English UI copy, not an identifier or a brand. */
const ENGLISH_COPY = [
  'Character',
  'Background',
  'Language',
  'Kid mode',
  'Speech input',
  'Taking you to',
  'Opening story',
  'Choose your',
  'Settings',
];

function componentSources(): { name: string; src: string }[] {
  return readdirSync(componentsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({ name: f, src: readFileSync(join(componentsDir, f), 'utf8') }));
}

describe('no hardcoded English in user-facing attributes', () => {
  it('aria-label / placeholder / title never ship literal English prose', () => {
    const offences: string[] = [];
    for (const { name, src } of componentSources()) {
      // Only literal (quoted) attribute values — {t(...)} expressions are fine.
      const re = /(aria-label|placeholder|title)="([^"]+)"/g;
      for (const m of src.matchAll(re)) {
        const value = m[2]!;
        if (ENGLISH_COPY.some((phrase) => value.includes(phrase))) {
          offences.push(`${name}: ${m[1]}="${value}"`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  it('the grids label themselves through t(lang, ...)', () => {
    const src = readFileSync(join(componentsDir, 'selectors.tsx'), 'utf8');
    expect(src).toContain("aria-label={t(lang, 'chooseCharacter')}");
    expect(src).toContain("aria-label={t(lang, 'chooseBackground')}");
    expect(src).toContain("aria-label={t(value, 'chooseLanguage')}");
  });

  it('the Kid Mode badge title is localized', () => {
    const src = readFileSync(join(componentsDir, 'StatusPlate.tsx'), 'utf8');
    // r2026-11-08: the 🧸 badge retired with Kid Mode (adult-only product), so
    // the old title assertion moved to the adult-only gate copy instead.
    expect(src).not.toContain('title={t(lang, \'kidMode\')}');
    expect(src).not.toContain('title="Kid mode"');
    expect(t('en', 'settingsAdultOnly')).toContain('18+');
  });

  it('the reused keys resolve in every shipped language', () => {
    // 'kidMode' is retained (data field + string, retired from the UI); the
    // gate keys below are what the live entry screen actually renders.
    for (const key of [
      'chooseCharacter', 'chooseBackground', 'chooseLanguage', 'kidMode',
      'settingsAdultOnly', 'gate18Title', 'gate18Ack',
      'close', 'setupProgress', 'next', 'setupStepOf', 'idleRailAria', 'idleEnabled', 'idleDisabled',
    ] as const) {
      const seen = new Set<string>();
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        const s = t(lang, key);
        expect(s.length).toBeGreaterThan(0);
        seen.add(s);
      }
      // Four languages should not all collapse to one string.
      expect(seen.size).toBeGreaterThan(1);
    }
  });
});
