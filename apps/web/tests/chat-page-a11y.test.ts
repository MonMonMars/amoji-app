import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/chat/page.tsx'), 'utf8');

describe('chat page main a11y', () => {
  it('labels main via sr-only character title', () => {
    expect(src).toContain('aria-labelledby="amoji-chat-title"');
    expect(src).toContain('id="amoji-chat-title"');
    expect(src).toContain('className="sr-only"');
    expect(src).toContain('{character.name}');
  });

  it('keeps boot busy state on main', () => {
    expect(src).toContain('aria-busy={!bootReady}');
  });
});
