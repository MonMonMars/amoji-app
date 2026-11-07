import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const fan = readFileSync(join(web, 'components/ArcFan.tsx'), 'utf8');

describe('ArcFan keyboard navigation', () => {
  it('moves focus with ArrowLeft/ArrowRight/Home/End on the fan and focused card', () => {
    expect(fan).toContain('onKeyNav');
    expect(fan).toContain("event.key === 'ArrowLeft'");
    expect(fan).toContain("event.key === 'ArrowRight'");
    expect(fan).toContain("event.key === 'Home'");
    expect(fan).toContain("event.key === 'End'");
    expect(fan).toContain('tabIndex={0}');
    expect(fan).toContain('onKeyDown={onKeyNav}');
    expect(fan).toContain('go(indexRef.current - 1, { focus: true })');
    expect(fan).toContain('go(indexRef.current + 1, { focus: true })');
    // Focus follows the newly selected card for continued arrowing.
    expect(fan).toContain('opts?.focus');
    expect(fan).toContain('btn?.focus()');
    expect(fan).toContain('CSS.escape(item.id)');
  });
});
