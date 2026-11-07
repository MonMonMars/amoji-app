import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');

describe('play soft-land chrome', () => {
  it('/play soft-lands on /chat with SoftLandChat chrome (no blank null)', () => {
    const play = readFileSync(join(web, 'app/play/page.tsx'), 'utf8');
    expect(play).toContain('SoftLandChat');
    expect(play).toContain('PlayRedirect');
    expect(play).not.toMatch(/return\s+null/);
    const soft = readFileSync(join(web, 'components/SoftLandChat.tsx'), 'utf8');
    expect(soft).toContain("router.replace('/chat')");
    expect(soft).toContain('aria-busy');
    expect(soft).toContain('bg-neutral-950');
  });
});
