import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { storyOpeningLine, storyPersonaSuffix } from '../lib/story-session';
import { saveStorySession, clearStorySession } from '../lib/story-session';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('story mode distinct from chat', () => {
  it('select story board hides chat SceneBackdrop and uses cast-led setup', () => {
    const board = read('components/SelectionBoard.tsx');
    expect(board).toContain("boardMode !== 'story'");
    expect(board).toContain('selection-hero-story');
    expect(board).toContain('StorySetupPanel');
    const setup = read('components/StorySetupPanel.tsx');
    expect(setup).toContain('story-hero');
    expect(setup).toContain('story-scene-inset');
    expect(setup).toContain('LABEL.withYou');
  });

  it('chat room marks story mode and opens with scene line', () => {
    const chat = read('app/chat/page.tsx');
    expect(chat).toContain('story-mode-room');
    expect(chat).toContain('story-mode-badge');
    expect(chat).toContain('data-story-mode');
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('storyOpeningLine');
    expect(panel).toContain('inStory');
    expect(panel).toMatch(/skipBrief[\s\S]*inStory/);
  });

  it('persona suffix pulls the user into the scene (not plain chat)', () => {
    const mem = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => { mem.set(k, String(v)); },
        removeItem: (k: string) => { mem.delete(k); },
      },
    });
    clearStorySession();
    expect(storyOpeningLine('en')).toBeNull();
    saveStorySession({
      sceneId: 'night-train-downtown',
      characterId: 'a01-shino',
      backgroundId: 'neon',
    });
    expect(storyOpeningLine('en')).toMatch(/seat|car/i);
    expect(storyPersonaSuffix('en')).toMatch(/STORY MODE|train/i);
    expect(storyPersonaSuffix('en')).toMatch(/not ordinary chat|steer with you/i);
    clearStorySession();
  });
});
