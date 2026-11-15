import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { storyOpeningLine, storyPersonaSuffix } from '../lib/story-session';
import { saveStorySession, clearStorySession } from '../lib/story-session';
import { STORY_SCENES } from '../lib/stories';

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
    expect(setup).toMatch(/They lead|一齊推故事|一起推动故事|一緒に物語/);
    expect(setup).toContain('aspect-[3/4]');
    expect(setup).toContain('h-[4.25rem] w-[5.75rem]');
    expect(setup).toContain('min-h-12');
  });

  it('chat room marks story mode and opens with scene line (never chat hello)', () => {
    const chat = read('app/chat/page.tsx');
    expect(chat).toContain('story-mode-room');
    expect(chat).toContain('story-mode-badge');
    expect(chat).toContain('data-story-mode');
    expect(chat).toMatch(/In story|故事進行中/);
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('storyOpeningLine');
    expect(panel).toContain('inStory');
    expect(panel).toMatch(/skipBrief[\s\S]*inStory/);
    expect(panel).toMatch(/const openLine = inStory[\s\S]*storyOpen[\s\S]*buildOpenCheerLine/);
    expect(panel).toContain('storyContinue');
    expect(panel).toMatch(/!loadStorySession\(\) && \([\s\S]*<DemoPhaseRail/);
    expect(panel).toContain('inStoryIdle');
  });

  it('every story pack ships an opening line that leads the tale', () => {
    for (const scene of STORY_SCENES) {
      expect(scene.openingLine?.en?.trim().length).toBeGreaterThan(8);
      expect(scene.openingLine?.yue?.trim().length).toBeGreaterThan(4);
      expect(scene.openingLine?.zh?.trim().length).toBeGreaterThan(4);
      expect(scene.openingLine?.ja?.trim().length).toBeGreaterThan(4);
    }
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
    expect(storyOpeningLine('en')).toMatch(/seat|car|doors|lights/i);
    expect(storyPersonaSuffix('en')).toMatch(/STORY MODE|train/i);
    expect(storyPersonaSuffix('en')).toMatch(/not ordinary chat|steer with you|in-character/i);
    expect(storyPersonaSuffix('en')).toMatch(/Never bolt dance|skill brief/i);
    expect(storyPersonaSuffix('en')).toMatch(/emotional arc|unhurried|never a flat short summary/i);
    saveStorySession({
      sceneId: 'rainy-cafe-window',
      characterId: 'a01-shino',
      backgroundId: 'rain',
    });
    expect(storyOpeningLine('en')).toMatch(/window|cup|soaked|rain|seat/i);
    clearStorySession();
  });
});
