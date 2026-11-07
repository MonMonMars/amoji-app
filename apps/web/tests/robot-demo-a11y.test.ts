import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/robot-demo/page.tsx'), 'utf8');

describe('robot-demo page a11y', () => {
  it('labels main landmark, back link, and canvases', () => {
    expect(src).toContain('aria-labelledby="amoji-robot-demo-title"');
    expect(src).toContain('id="amoji-robot-demo-title"');
    expect(src).toContain('aria-label="Back to select"');
    expect(src).toContain('aria-label="Emotion face"');
    expect(src).toContain('aria-label="LED matrix preview"');
    expect(src).toContain('role="img"');
  });

  it('groups emotion chips and labels speak input', () => {
    expect(src).toContain('role="group"');
    expect(src).toContain('aria-label="Emotions"');
    expect(src).toContain('aria-label={e}');
    expect(src).toContain('aria-label="Line to speak"');
    expect(src).toContain('aria-label="Speak"');
    expect(src).toContain('type="button"');
  });
});
