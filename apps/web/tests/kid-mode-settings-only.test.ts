import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('Kid mode control lives in Settings only', () => {
  it('SettingsSheet keeps the kid mode toggle', () => {
    const sheet = read('components/SettingsSheet.tsx');
    expect(sheet).toContain("t(lang, 'kidMode')");
    expect(sheet).toContain('toggleKid');
    expect(sheet).toContain("<Toggle label={t(lang, 'kidMode')} on={prefs.kidMode}");
  });

  it('character select top bars have no kid mode chip', () => {
    const bars = read('components/SelectTopBars.tsx');
    expect(bars).not.toContain('select-mode-kid');
    expect(bars).not.toContain('onKidMode');
    expect(bars).not.toContain('kidMode');
    expect(bars).toContain('select-mode-chat');
    expect(bars).toContain('select-mode-story');
  });

  it('SelectionBoard does not wire onKidMode', () => {
    const board = read('components/SelectionBoard.tsx');
    expect(board).not.toContain('onKidMode');
    expect(board).not.toContain('setKidMode');
    expect(board).toContain('<SelectTopBars');
  });
});