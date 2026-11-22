import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLIP_LIBRARY, emotionKindForFile, listClipLibrary } from '../lib/voice-clips';

const web = join(__dirname, '..');
const onDisk = (rel: string) => {
  const p = join(web, 'public', rel.replace(/^\//, ''));
  return existsSync(p) ? statSync(p).size : 0;
};

const MALE_ADDS = ['um.mp3', 'haha.mp3', 'hmm.mp3', 'ouch.mp3', 'yelp.mp3', 'yawn.mp3'];
const FEMALE_ADDS = ['haha.mp3', 'hmm.mp3', 'ouch.mp3', 'yelp.mp3', 'hiccup.mp3'];

describe('r282 universal reaction SFX additions', () => {
  it('appends every new file at the tail of CLIP_LIBRARY.universal', () => {
    const male = CLIP_LIBRARY.universal.male as readonly string[];
    const female = CLIP_LIBRARY.universal.female as readonly string[];
    expect(male.slice(-MALE_ADDS.length)).toEqual(MALE_ADDS);
    expect(female.slice(-FEMALE_ADDS.length)).toEqual(FEMALE_ADDS);
    // Existing 1–94 authoritatively numbered rows did not move.
    expect(male).toHaveLength(11);
    expect(female).toHaveLength(22);
  });

  it('resolves all 11 new files on disk with non-zero bytes', () => {
    for (const file of MALE_ADDS) {
      expect(onDisk(`voice-clips/universal/male/${file}`), `male/${file}`).toBeGreaterThan(0);
    }
    for (const file of FEMALE_ADDS) {
      expect(onDisk(`voice-clips/universal/female/${file}`), `female/${file}`).toBeGreaterThan(0);
    }
    const paths = new Set(listClipLibrary().map((e) => e.path));
    for (const file of MALE_ADDS) expect(paths.has(`/voice-clips/universal/male/${file}`)).toBe(true);
    for (const file of FEMALE_ADDS) expect(paths.has(`/voice-clips/universal/female/${file}`)).toBe(true);
  });

  it('keeps the pre-existing universal rows in place before the additions', () => {
    const list = listClipLibrary();
    expect(list[93]?.path).toBe('/voice-clips/universal/female/wow_woven.mp3'); // #94 unchanged
    // Female additions are appended at #95–#99, so universal/male shifts to #100.
    expect(list[99]?.path).toBe('/voice-clips/universal/male/laugh.mp3');
    expect(list[103]?.path).toBe('/voice-clips/universal/male/sigh.mp3');
    expect(list[104]?.path).toBe('/voice-clips/universal/male/um.mp3');
    expect(list).toHaveLength(110);
  });

  it('maps haha → laugh and hmm → um so the new takes join the right burst', () => {
    expect(emotionKindForFile('haha.mp3')).toBe('laugh');
    expect(emotionKindForFile('hmm.mp3')).toBe('um');
    expect(emotionKindForFile('ouch.mp3')).toBeNull();
    expect(emotionKindForFile('hiccup.mp3')).toBeNull();
  });
});
