import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/FallbackNotice.tsx'), 'utf8');
const chat = readFileSync(join(__dirname, '../app/chat/page.tsx'), 'utf8');

describe('FallbackNotice live status (chat calm/placeholder)', () => {
  it('announces via role=status SoftLand/StatusPlate parity (no explicit aria-live)', () => {
    expect(src).toContain('role="status"');
    expect(src).toContain("reason === 'webgl'");
    expect(src).toContain('Chat still works.');
    expect(src).not.toContain('aria-live');
  });

  it('stays mounted from chat when notice is set', () => {
    expect(chat).toContain('FallbackNotice');
    expect(chat).toContain('reason={notice.reason}');
  });
});
