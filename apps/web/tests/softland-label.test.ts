import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('SoftLand label ellipsis (no mojibake)', () => {
  it('defaults and page overrides use ASCII ...', () => {
    const select = read('components/SoftLandSelect.tsx');
    const chat = read('components/SoftLandChat.tsx');
    expect(select).toContain("label = 'Taking you to character select...'");
    expect(chat).toContain("label = 'Taking you to chat...'");
    expect(select).not.toMatch(/select\?\?/);
    expect(chat).not.toMatch(/chat\?\?/);
    expect(read('app/mode/page.tsx')).toContain('Taking you to character select...');
    expect(read('app/setup/page.tsx')).toContain('Taking you to character select...');
    expect(read('app/story/page.tsx')).toContain('Opening story select...');
  });
});
