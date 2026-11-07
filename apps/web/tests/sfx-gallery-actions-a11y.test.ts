import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/sfx-gallery/page.tsx'), 'utf8');

describe('sfx-gallery Clear/Export/Chat residual a11y', () => {
  it('labels Chat nav + export/clear/reset toolbar', () => {
    expect(src).toContain('aria-label={openChat}');
    expect(src).toContain('href="/chat"');
    expect(src).toContain('aria-label="Copy Want/Skip JSON"');
    expect(src).toContain('data-testid="cma-export"');
    expect(src).toContain('aria-label="Clear skipped picks"');
    expect(src).toContain('aria-label="Reset all picks"');
  });

  it('scopes Play/Want/Skip/Clear labels to clip code', () => {
    expect(src).toContain('aria-label={`Play ${clip.code}`}');
    expect(src).toContain('aria-label={`Want ${clip.code}`}');
    expect(src).toContain('aria-label={`Skip ${clip.code}`}');
    expect(src).toContain('aria-label={`Clear ${clip.code}`}');
    expect(src).toContain("aria-pressed={verdict === 'want'}");
    expect(src).toContain("aria-pressed={verdict === 'skip'}");
  });

  it('keeps main landmark from #182', () => {
    expect(src).toContain('aria-labelledby="amoji-sfx-gallery-title"');
    expect(src).toContain('aria-label={backSelect}');
  });
});
