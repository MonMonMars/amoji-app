import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/chat/page.tsx'), 'utf8');

describe('chat settings gear localized a11y', () => {
  it('names Settings via t(prefs.lang, settings) for title + aria-label', () => {
    expect(src).toContain("import { usePrefs, characterById, backgroundById, KID_PERSONA_GUARD, t } from '../../lib/prefs'");
    expect(src).toContain("title={t(prefs.lang, 'settings')}");
    expect(src).toContain("aria-label={t(prefs.lang, 'settings')}");
    expect(src).not.toContain("prefs.lang === 'yue' ? '設定' : 'Settings'");
  });
});
