import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const row = readFileSync(join(__dirname, '../components/HScrollRow.tsx'), 'utf8');

describe('HScrollRow wardrobe a11y + mouse arrows', () => {
  it('exposes a labeled group with keyboard Left/Right and type=button chevrons', () => {
    expect(row).toContain('role="group"');
    expect(row).toContain('aria-label={ariaLabel}');
    expect(row).toContain('tabIndex={ariaLabel ? 0 : undefined}');
    expect(row).toContain('onKeyDown={onKeyNav}');
    expect(row).toContain("event.key === 'ArrowLeft'");
    expect(row).toContain("event.key === 'ArrowRight'");
    expect(row).toContain('type="button"');
    expect(row).toContain('scroll left');
    expect(row).toContain('scroll right');
  });

  it('decides mouse/trackpad arrows on first client paint (no false?true flash)', () => {
    expect(row).toContain("window.matchMedia('(pointer: fine)')");
    expect(row).toContain("window.matchMedia('(hover: hover)')");
    expect(row).toMatch(/useState\(\(\) => \{/);
    expect(row).not.toMatch(/const \[showArrows, setShowArrows\] = useState\(false\)/);
  });
});
