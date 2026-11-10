import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  CMA_REACTION_DROPPED_CODES,
  CMA_REACTION_GALLERY,
  CMA_REACTION_KEEP_CODES,
  CMA_REACTION_RANGE,
  expectedCmaReactionCodes,
} from '../lib/cma-reaction-gallery';

const row = readFileSync(join(__dirname, '../components/EmotionClipRow.tsx'), 'utf8');

describe('select reaction row = numbered CMA newer set only', () => {
  it('ships Mon keepers + poke CMA00350–362 and drops old CLIP_LIBRARY from select row', () => {
    expect(CMA_REACTION_RANGE.from).toBe(304);
    expect(CMA_REACTION_RANGE.to).toBe(362);
    expect(CMA_REACTION_KEEP_CODES).toHaveLength(6);
    expect(CMA_REACTION_DROPPED_CODES).toHaveLength(40);
    expect(CMA_REACTION_GALLERY).toHaveLength(19);
    expect(CMA_REACTION_GALLERY.map((c) => c.code)).toEqual(expectedCmaReactionCodes());
    expect(row).toContain('CMA_REACTION_GALLERY');
    expect(row).toContain('data-reaction-n={n}');
    expect(row).toContain('data-cma-code={clip.code}');
    expect(row).not.toContain('CLIP_LIBRARY[');
    expect(row).not.toMatch(/previewLibraryClip|CLIP_LIBRARY\[/);
  });
});
