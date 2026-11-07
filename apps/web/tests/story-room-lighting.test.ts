import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('story room readable lighting pipeline', () => {
  const room = read('lib/vrm/story-room.ts');
  const canvas = read('components/CompanionCanvas.tsx');

  it('sanitizes room materials to matte readable under cast daylight', () => {
    expect(room).toContain('export function sanitizeStoryRoomMaterials');
    expect(room).toMatch(/metalness\s*=\s*0/);
    expect(room).toContain('STORY_ROOM_MIN_ROUGHNESS');
    expect(room).toMatch(/roughness\s*=\s*Math\.max\(STORY_ROOM_MIN_ROUGHNESS/);
    expect(room).toContain('STORY_ROOM_MIN_ALBEDO_LUM');
  });

  it('places room so front face stays behind the companion', () => {
    expect(room).toContain('export function placeStoryRoomBehind');
    expect(room).toContain('setFromObject');
    expect(room).toContain('box.max.z');
    expect(room).toContain('STORY_ROOM_MAX_FRONT_Z');
    expect(room).toMatch(/dz\s*<\s*0/);
  });

  it('CompanionCanvas runs sanitize + place after room fit before add', () => {
    expect(canvas).toContain("from '../lib/vrm/story-room'");
    expect(canvas).toContain('sanitizeStoryRoomMaterials(room)');
    expect(canvas).toContain('placeStoryRoomBehind(room)');
    const fitIdx = canvas.indexOf('room.position.z -= 2.6');
    const sanIdx = canvas.indexOf('sanitizeStoryRoomMaterials(room)', fitIdx);
    const placeIdx = canvas.indexOf('placeStoryRoomBehind(room)', sanIdx);
    const addIdx = canvas.indexOf('roomRoot.add(room)', placeIdx);
    expect(fitIdx).toBeGreaterThan(-1);
    expect(sanIdx).toBeGreaterThan(fitIdx);
    expect(placeIdx).toBeGreaterThan(sanIdx);
    expect(addIdx).toBeGreaterThan(placeIdx);
  });
});
