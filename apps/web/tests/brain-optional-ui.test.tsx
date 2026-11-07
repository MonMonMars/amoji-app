// r2026-11-08 — the "optional upgrade" framing, enforced by rendering the real
// component rather than grepping its source.
//
// The measured problem: ~40%, ~80% (185 downloads → 36 keys) and 92% of users
// abandoned comparable products at the API-key step. So the Brain section must
// be structurally impossible to mistake for a required setup step — a collapsed
// row whose DEFAULT render contains no key field at all.
//
// react-dom/server is used because this repo ships no DOM test environment; a
// server render still proves the closed branch emits no input, which is exactly
// the property that matters (nothing to tab to, nothing to fill in).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BrainAdvanced from '../components/BrainAdvanced';
import { LANGS, STRINGS, t, type StrKey } from '../lib/prefs';

const render = () => renderToStaticMarkup(<BrainAdvanced lang="en" accent="#fbbf24" />);

describe('optional sharper brain — collapsed by default', () => {
  it('renders no key field and no provider picker until opened', () => {
    const html = render();
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain('amoji-settings-brain-key');
    expect(html).not.toContain('<select');
  });

  it('shows one affordance that says it is optional and that the app already works', () => {
    const html = render();
    expect(html).toContain(t('en', 'brainAdvanced'));
    expect(html).toContain(t('en', 'brainOptional'));
    // the collapsed row itself already promises the app runs without a key
    expect(html).toContain(t('en', 'brainAdvancedHint'));
    expect(html).toContain('aria-expanded="false"');
  });

  it('is labelled as a disclosure that controls the section it opens', () => {
    const html = render();
    expect(html).toContain('aria-controls="amoji-settings-brain"');
    // one single affordance — not a wizard with several entry points
    expect(html.match(/aria-expanded/g)).toHaveLength(1);
  });
});

describe('optional sharper brain — copy never reads as setup', () => {
  // Words that would turn an optional extra back into a setup step.
  const FORBIDDEN = /setup|step \d|required|you must|missing|complete to|finish setup|before you can/i;
  const KEYS: StrKey[] = [
    'brainAdvanced', 'brainAdvancedHint', 'brainOptional', 'brainWorksWithout',
    'brainHide', 'brainProvider', 'brainAuto', 'brainKeyLabel', 'brainKeyPlaceholder',
    'brainKeyStored', 'brainGetKey', 'brainTest', 'brainTesting', 'brainTestOk',
    'brainTestNokey', 'brainTestAuth', 'brainTestBlocked', 'brainTestModel',
    'brainTestCredit', 'brainTestOffline', 'brainTestTimeout', 'brainPrivacy', 'brainClearKey',
  ];

  it('the English copy states the app works without a key', () => {
    expect(STRINGS.brainWorksWithout.en).toMatch(/works without a key/i);
  });

  it('no brain string in any shipped language reads like a required setup step', () => {
    const offences: string[] = [];
    for (const key of KEYS) {
      for (const { id } of LANGS) {
        const value = STRINGS[key][id];
        expect(value, `${key}.${id} missing`).toBeTruthy();
        if (FORBIDDEN.test(value)) offences.push(`${key}.${id}: ${value}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('every probe verdict has a distinct line, so the Test button is actionable', () => {
    const verdicts: StrKey[] = [
      'brainTestOk', 'brainTestNokey', 'brainTestAuth', 'brainTestBlocked',
      'brainTestModel', 'brainTestCredit', 'brainTestOffline', 'brainTestTimeout',
    ];
    expect(new Set(verdicts.map((k) => STRINGS[k].en)).size).toBe(verdicts.length);
  });
});
