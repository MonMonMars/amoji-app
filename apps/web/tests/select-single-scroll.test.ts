import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

const board = read('components/SelectionBoard.tsx');

/** Every component the /select board renders in chat mode. */
const SELECT_TREE = [
  'components/SelectionBoard.tsx',
  'components/SelectTopBars.tsx',
  'components/ArcFan.tsx',
  'components/TtsVoiceRow.tsx',
  'components/EmotionClipRow.tsx',
  'components/ModelThumb.tsx',
];

/** Class tokens that make an element its own vertical scroller. */
function verticalScrollers(src: string): string[] {
  const tokens = src.match(/className=(?:"[^"]*"|\{`[^`]*`\})/g) ?? [];
  return tokens.filter((cls) =>
    /(?:^|[\s"'`])(?:overflow-y-auto|overflow-y-scroll|overflow-auto|overflow-scroll)(?:$|[\s"'`])/.test(cls),
  );
}

describe('select board uses exactly one vertical scroll container', () => {
  it('has one vertical scroller, and it is the board itself', () => {
    const hits = verticalScrollers(board);
    expect(hits).toHaveLength(1);
    const scroller = board.slice(board.indexOf('data-testid="select-scroll"') - 400, board.indexOf('data-testid="select-scroll"') + 400);
    expect(scroller).toContain('data-testid="select-scroll"');
  });

  it('does not nest a second scroller in any row of the select tree', () => {
    for (const file of SELECT_TREE.slice(1)) {
      expect({ file, scrollers: verticalScrollers(read(file)) }).toEqual({ file, scrollers: [] });
    }
  });

  it('stacks every row inside the one scroller, in order', () => {
    const scrollStart = board.indexOf('data-testid="select-scroll"');
    const scrollEnd = board.indexOf('data-testid="selection-confirm"');
    expect(scrollStart).toBeGreaterThan(-1);
    expect(scrollEnd).toBeGreaterThan(scrollStart);

    const inner = board.slice(scrollStart, scrollEnd);
    const order = [
      "ariaLabel={t(lang, 'chooseCharacter')}",
      "ariaLabel={t(lang, 'chooseBackground')}",
      "ariaLabel={t(lang, 'chooseLanguage')}",
      '<TtsVoiceRow',
      '<EmotionClipRow',
    ];
    const positions = order.map((needle) => inner.indexOf(needle));
    for (const [i, pos] of positions.entries()) {
      expect(pos).toBeGreaterThan(i === 0 ? -1 : positions[i - 1]!);
    }

    // No row-level max-height caps or scroll hints left behind.
    expect(inner).not.toContain('max-h-[52dvh]');
    expect(inner).not.toContain('max-h-[48dvh]');
    expect(inner).not.toContain('max-h-[34dvh]');
  });

  it('keeps the bottom CTA reachable outside the scroller (always visible)', () => {
    const scrollEnd = board.indexOf('data-testid="selection-confirm"');
    const cta = board.indexOf('data-testid="selection-confirm-cta"');
    const scrollStart = board.indexOf('data-testid="select-scroll"');
    expect(scrollEnd).toBeGreaterThan(scrollStart);
    expect(cta).toBeGreaterThan(scrollEnd);
    expect(board).toContain('fx-start');
  });

  it('keeps mobile safe-area padding on the shared scroller', () => {
    const scrollerStart = board.indexOf('data-testid="select-scroll"');
    const scroller = board.slice(scrollerStart, scrollerStart + 700);
    expect(scroller).toContain('env(safe-area-inset-bottom)');
    // Top chrome (SelectTopBars) still guards the notch.
    expect(read('components/SelectTopBars.tsx')).toContain('env(safe-area-inset-top)');
  });

  it('does not trap the page wheel inside a fan card row', () => {
    const fan = read('components/ArcFan.tsx');
    // A plain vertical wheel must fall through to the page scroller.
    expect(fan).toContain('verticalScrollParent(el)');
    // Vertical panning on touch is still the page's.
    expect(fan).toContain('touch-pan-y');
    expect(fan).not.toContain('touch-none');
  });
});
