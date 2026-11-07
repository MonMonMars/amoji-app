import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/selectors.tsx'), 'utf8');

describe('LangChips aria-labels', () => {
  it('each language chip exposes native-name aria-label + pressed state', () => {
    const i = src.indexOf('export function LangChips');
    const slice = src.slice(i);
    expect(slice).toContain('aria-label={l.native}');
    expect(slice).toContain('aria-pressed={active}');
    expect(slice).toContain('type="button"');
    expect(slice).toContain('role="group"');
    expect(slice).toContain('aria-label="Language"');
  });

  it('LangChips still maps LANGS ids', () => {
    const i = src.indexOf('export function LangChips');
    const slice = src.slice(i);
    expect(slice).toContain('LANGS.map');
    expect(slice).toContain('onChange(l.id)');
  });
});
