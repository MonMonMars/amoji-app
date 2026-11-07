import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const src = readFileSync(join(__dirname, '../components/FallbackNotice.tsx'), 'utf8');
const chat = readFileSync(join(__dirname, '../app/chat/page.tsx'), 'utf8');

describe('FallbackNotice live status (chat calm/placeholder)', () => {
  it('announces via role=status SoftLand/StatusPlate parity (no explicit aria-live)', () => {
    expect(src).toContain('role="status"');
    expect(src).toContain("reason === 'webgl'");
    expect(src).not.toContain('aria-live');
    // Copy moved into STRINGS so it can be localized; it still has to tell the
    // user chat works, which is the point of the notice.
    expect(t('en', 'fallbackWebgl')).toContain('Chat still works.');
    expect(t('en', 'fallbackAsset')).toContain('Chat still works.');
  });

  it('stays mounted from chat when notice is set', () => {
    expect(chat).toContain('FallbackNotice');
    expect(chat).toContain('reason={notice.reason}');
    expect(chat).toContain('lang={prefs.lang}');
  });
});
