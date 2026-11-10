import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  CMA_REACTION_DROPPED_CODES,
  CMA_REACTION_GALLERY,
  CMA_REACTION_RANGE,
  expectedCmaReactionCodes,
} from '../lib/cma-reaction-gallery';

const row = readFileSync(join(__dirname, '../components/EmotionClipRow.tsx'), 'utf8');

describe('select reaction row = numbered CMA newer set only', () => {
  it('ships CMA00304–349 minus dropped #1–11 and drops old CLIP_LIBRARY from select row', () => {
    expect(CMA_REACTION_RANGE.from).toBe(304);
    expect(CMA_REACTION_RANGE.to).toBe(349);
    expect(CMA_REACTION_DROPPED_CODES).toHaveLength(11);
    expect(CMA_REACTION_GALLERY.length).toBe(
      CMA_REACTION_RANGE.to - CMA_REACTION_RANGE.from + 1 - CMA_REACTION_DROPPED_CODES.length,
    );
    expect(CMA_REACTION_GALLERY.map((c) => c.code)).toEqual(expectedCmaReactionCodes());
    expect(row).toContain('CMA_REACTION_GALLERY');
    expect(row).toContain('data-reaction-n={n}');
    expect(row).toContain('data-cma-code={clip.code}');
    expect(row).not.toContain('CLIP_LIBRARY[');
    expect(row).not.toMatch(/previewLibraryClip|CLIP_LIBRARY\[/);
  });
});
