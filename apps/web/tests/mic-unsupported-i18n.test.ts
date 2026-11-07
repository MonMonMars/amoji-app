import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const web = join(__dirname, '..');
const chatPanel = readFileSync(join(web, 'components/ChatPanel.tsx'), 'utf8');

describe('mic-unsupported alert is localized for every language', () => {
  it('uses t(lang, micUnsupported) instead of a yue/English ternary', () => {
    expect(chatPanel).toContain("window.alert(t(lang, 'micUnsupported'))");
  });

  it('no longer falls through to English for zh and ja', () => {
    // The old code was `lang === 'yue' ? <canto> : <english>`, so only
    // Cantonese users ever saw a translated message.
    expect(chatPanel).not.toContain("lang === 'yue'\n        ? '你嘅瀏覽器唔支援語音輸入");
    expect(chatPanel).not.toContain('Speech input is not supported in this browser');
  });

  it('every shipped language resolves, and CJK differs from English', () => {
    const en = t('en', 'micUnsupported');
    expect(en.length).toBeGreaterThan(0);
    for (const lang of ['yue', 'zh', 'ja'] as const) {
      const s = t(lang, 'micUnsupported');
      expect(s.length).toBeGreaterThan(0);
      expect(s).not.toBe(en);
    }
  });

  it('keeps the actionable advice in English (latest Chrome or Safari)', () => {
    expect(t('en', 'micUnsupported')).toContain('Chrome');
    expect(t('en', 'micUnsupported')).toContain('Safari');
  });
});
