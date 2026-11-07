import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/robot-demo/page.tsx'), 'utf8');

describe('robot-demo emotion chips aria-pressed', () => {
  it('tracks pressed emotion on chips', () => {
    expect(src).toContain('const [emotion, setEmotion] = useState<string | null>(null)');
    expect(src).toContain('aria-pressed={emotion === e}');
    expect(src).toContain('setEmotion(e)');
    expect(src).toContain('faceRef.current?.setEmotion(e, 1)');
    expect(src).toContain('aria-label={e}');
  });

  it('keeps emotion group + labels fullscreen face link', () => {
    expect(src).toContain('role="group"');
    expect(src).toContain('aria-label="Emotions"');
    expect(src).toContain('aria-label="Fullscreen robot display"');
    expect(src).toContain('href="./face"');
  });
});
