import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('SetupFlow / robot-demo type=button', () => {
  it('SetupFlow back and next are type=button', () => {
    const src = read('components/SetupFlow.tsx');
    expect(src).toContain('type="button" onClick={() => setStep(step - 1)}');
    expect(src).toMatch(/type="button"[\s\S]{0,80}onClick=\{next\}/);
  });

  it('robot-demo emotion and speak are type=button', () => {
    const src = read('app/robot-demo/page.tsx');
    expect(src).toMatch(/type="button"[\s\S]{0,80}setEmotion\(e, 1\)/);
    expect(src).toContain('type="button" onClick={speak}');
    const tags = src.match(/<button\b[\s\S]*?>/g) ?? [];
    for (const tag of tags) {
      if (tag.length > 400) continue;
      expect(tag).toMatch(/type\s*=\s*["']button["']/);
    }
  });
});
