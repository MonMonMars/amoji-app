import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('select board language → chat LLM + voice', () => {
  it('SelectionBoard persists live prefs (incl. lang) on confirm before /chat', () => {
    const board = read('components/SelectionBoard.tsx');
    expect(board).toContain("if (mode === 'start') setPrefs(patch)");
    expect(board).toContain('flushLivePrefs()');
    expect(board).toContain('loadPrefs()');
    expect(board).toContain('savePrefs(next)');
    expect(board).toMatch(/const go = \(\) => \{[\s\S]*?flushLivePrefs\(\)/);
  });

  it('chat waits for prefs sync and keys ChatPanel by character + lang', () => {
    const chat = read('app/chat/page.tsx');
    expect(chat).toContain('const [prefs, setPrefs, prefsReady] = usePrefs()');
    expect(chat).toContain('const bootReady = prefsReady');
    expect(chat).toContain('key={`${character.id}:${prefs.lang}`}');
    expect(chat).toContain('lang={prefs.lang}');
  });

  it('ChatPanel send payload carries language from props', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('language: lang');
  });

  it('story enter merges loadPrefs so lang from select row is not dropped', () => {
    const story = read('components/StorySetupPanel.tsx');
    expect(story).toContain('const base = loadPrefs()');
    expect(story).toContain('...base');
    expect(story).toContain('...prefs');
  });
});
