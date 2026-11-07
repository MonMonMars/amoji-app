import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const picker = readFileSync(join(__dirname, '../components/MiniGamePicker.tsx'), 'utf8');
const wardrobe = readFileSync(join(__dirname, '../components/WardrobeSwap.tsx'), 'utf8');

describe('MiniGamePicker / WardrobeSwap residual a11y', () => {
  it('labels picker dialog via titled heading + hint', () => {
    expect(picker).toContain('role="dialog"');
    expect(picker).toContain('aria-modal="true"');
    expect(picker).toContain('aria-labelledby="amoji-minigame-picker-title"');
    expect(picker).toContain('aria-describedby="amoji-minigame-picker-hint"');
    expect(picker).toContain('id="amoji-minigame-picker-title"');
    expect(picker).toContain('id="amoji-minigame-picker-hint"');
    expect(picker).toContain('{ui.menu}');
    expect(picker).toContain('{ui.menuHint}');
  });

  it('keeps menu + close controls labeled', () => {
    expect(picker).toContain('aria-label={ui.menu}');
    expect(picker).toContain('aria-label={ui.close}');
  });

  it('names wardrobe thumbs with aria-label (not title alone)', () => {
    expect(wardrobe).toContain('aria-pressed={pressed}');
    expect(wardrobe).toContain('aria-label={asset.name}');
    expect(wardrobe).toContain('title={asset.name}');
  });
});
