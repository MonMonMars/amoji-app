import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKGROUNDS, characterById } from '../lib/prefs';
import { STORY_SCENES, resolveStoryCast, rollStory, storyById } from '../lib/stories';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(here, rel), 'utf8');

describe('story mode catalog (t740)', () => {
  it('ships at least one sample scene with a night-train beat', () => {
    expect(STORY_SCENES.length).toBeGreaterThanOrEqual(5);
    expect(STORY_SCENES.map((x) => x.id)).toEqual(
      expect.arrayContaining(['night-train-downtown', 'rainy-cafe-window', 'rooftop-evening', 'bookstore-aisle', 'beach-dusk']),
    );
    const train = storyById('night-train-downtown');
    expect(train).toBeTruthy();
    expect(train!.backgroundId).toBe('neon');
    expect(train!.castPool.length).toBeGreaterThan(0);
    expect(train!.systemBeat.en.toLowerCase()).toContain('train');
  });

  it('locks backgrounds to known painted scenes and resolves cast', () => {
    const bgIds = new Set(BACKGROUNDS.map((b) => b.id));
    for (const scene of STORY_SCENES) {
      expect(bgIds.has(scene.backgroundId)).toBe(true);
      const cast = resolveStoryCast(scene);
      expect(cast.length).toBeGreaterThan(0);
      for (const id of cast) {
        expect(characterById(id).id).toBe(id);
      }
    }
  });

  it('rolls a character from the scene pool', () => {
    const a = rollStory({ sceneId: 'night-train-downtown', n: 3 });
    const pool = resolveStoryCast(a.scene);
    expect(pool).toContain(a.characterId);
  });
});

describe('mode + story entry (t741)', () => {
  it('login lands on mode; chat and story routes exist', () => {
    expect(read('../app/login/page.tsx')).toContain("router.push('/mode')");
    expect(read('../app/setup/page.tsx')).toContain("router.replace('/mode')");
    const mode = read('../app/mode/page.tsx');
    expect(mode).toContain('data-testid="mode-chat"');
    expect(mode).toContain('data-testid="mode-story"');
    expect(mode).toContain("router.push('/select')");
    expect(mode).toContain("router.push('/story')");
    expect(read('../app/story/page.tsx')).toContain('data-testid="story-start"');
    expect(read('../app/story/page.tsx')).toContain('saveStorySession');
  });

  it('chat prepends the story beat and select clears the session', () => {
    expect(read('../app/chat/page.tsx')).toContain('storyPersonaSuffix');
    const board = read('../components/SelectionBoard.tsx');
    expect(board).toContain('clearStorySession');
    expect(board).toContain('chat-mode-label');
  });
});

describe('story pack picker UI', () => {
  it('lists every pack chip and a surprise control on /story', () => {
    const page = read('../app/story/page.tsx');
    expect(page).toContain('story-pack-random');
    expect(page).toContain('STORY_SCENES.map');
    expect(page).toContain('story-pack-${s.id}');
    expect(page).toContain('rollStory');
    expect(page).toMatch(/sceneId:\s*packId/);
  });
});

describe('story scene GLB map (want12)', () => {
  it('exposes SCENE_GLB paths and resolveStorySceneGlb prefers primary', async () => {
    const mod = await import('../lib/stories');
    expect(mod.SCENE_GLB.cafeInterior).toContain('cafe-interior');
    expect(mod.SCENE_GLB.subwayTrain).toContain('subway-train');
    const cafe = mod.storyById('rainy-cafe-window');
    expect(cafe?.sceneGlbUrl).toBe(mod.SCENE_GLB.cafeInterior);
    expect(mod.resolveStorySceneGlb(cafe!)).toBe(mod.SCENE_GLB.cafeInterior);
    expect(mod.storyById('engawa-dusk')?.sceneGlbUrl).toBe(mod.SCENE_GLB.japaneseHouse);
  });

  it('ships each SCENE_GLB file under public/models', async () => {
    const { SCENE_GLB } = await import('../lib/stories');
    const root = path.resolve(here, '../public/models');
    for (const rel of Object.values(SCENE_GLB)) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }
  });
});

