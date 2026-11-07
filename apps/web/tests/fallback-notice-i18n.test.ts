import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('FallbackNotice is localized', () => {
  const notice = read('components/FallbackNotice.tsx');
  const chatPage = read('app/chat/page.tsx');

  it('renders through t(lang, ...) instead of literal English', () => {
    expect(notice).toContain("t(lang, reason === 'webgl' ? 'fallbackWebgl' : 'fallbackAsset')");
    // The old component carried both sentences inline, so yue/zh/ja users hit
    // English at the exact moment something had already gone wrong.
    expect(notice).not.toContain('WebGL is unavailable in this browser');
    expect(notice).not.toContain('could not load');
  });

  it('takes a lang prop and the chat page passes the live preference', () => {
    expect(notice).toContain('lang: Lang');
    expect(chatPage).toContain('<FallbackNotice reason={notice.reason} lang={prefs.lang} />');
  });

  it('keeps the status role so the notice is announced', () => {
    expect(notice).toContain('role="status"');
  });

  it('every shipped language has both notices, and they are not English', () => {
    for (const key of ['fallbackWebgl', 'fallbackAsset'] as const) {
      const en = t('en', key);
      expect(en.length).toBeGreaterThan(0);
      for (const lang of ['yue', 'zh', 'ja'] as const) {
        const s = t(lang, key);
        expect(s.length).toBeGreaterThan(0);
        expect(s).not.toBe(en);
      }
    }
  });

  it('no longer hardcodes the character name in the asset-failure copy', () => {
    // The old string said "Juno’s 3D model" regardless of the selected cast,
    // which is wrong for every other companion.
    expect(t('en', 'fallbackAsset')).not.toContain('Juno');
    expect(notice).not.toContain('Juno');
  });
});
