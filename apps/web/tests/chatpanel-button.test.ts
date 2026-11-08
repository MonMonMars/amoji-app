import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');

describe('ChatPanel mic/send type=button', () => {
  it('every <button> declares type=button', () => {
    const tags = src.match(/<button\b[\s\S]*?>/g) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(2);
    for (const tag of tags) {
      if (tag.length > 500) continue;
      expect(tag).toMatch(/type\s*=\s*["']button["']/);
    }
  });

  it('mic and send controls are typed buttons', () => {
    expect(src).toMatch(/type="button"[\s\S]{0,80}onClick=\{\(\) => mic\(\)\}/);
    expect(src).toMatch(/type="button"[\s\S]{0,80}onClick=\{\(\) => void send\(\)\}/);
    expect(src).toContain("aria-pressed={listening}");
    expect(src).toContain("t(lang, 'micOff')");
    expect(src).toContain("aria-label={t(lang, 'sendBtn')}");
  });
});
