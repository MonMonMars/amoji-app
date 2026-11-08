import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const chat = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
const prefs = readFileSync(join(__dirname, '../lib/prefs.ts'), 'utf8');

describe('ChatPanel hero mic on/off visuals', () => {
  it('toggles aria-pressed with listening and shows a crossed mic when dismissed', () => {
    expect(chat).toContain('aria-pressed={listening}');
    expect(chat).toContain('setMicDismissed(true)');
    expect(chat).toContain('data-testid="hero-mic-off"');
    expect(chat).toContain("t(lang, 'micOff')");
  });

  it('ships micOff copy for en/yue/zh/ja', () => {
    expect(prefs).toContain("| 'micOff'");
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(t(lang, 'micOff').length).toBeGreaterThan(3);
    }
  });
});
