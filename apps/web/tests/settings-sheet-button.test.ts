import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet type=button sweep', () => {
  it('every <button> opening tag declares type=button', () => {
    const tags = src.match(/<button\b[\s\S]*?>/g) ?? [];
    expect(tags.length).toBeGreaterThan(10);
    for (const tag of tags) {
      if (tag.length > 500) continue; // skip pathological
      expect(tag).toMatch(/type\s*=\s*["']button["']/);
    }
  });

  it('Toggle and close controls are typed buttons', () => {
    expect(src).toMatch(/role="switch"[\s\S]{0,80}type="button"|type="button"[\s\S]{0,80}role="switch"/);
    expect(src).toMatch(/type="button"[\s\S]{0,120}onClick=\{onClose\}|onClick=\{onClose\}[\s\S]{0,80}type="button"/);
  });
});
