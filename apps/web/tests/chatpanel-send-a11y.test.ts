import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('ChatPanel sendBtn localized a11y', () => {
  it('names the send control via sendBtn i18n', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain("aria-label={t(lang, 'sendBtn')}");
    expect(panel).not.toContain('aria-label="send"');
    expect(panel).toContain("t(lang, 'micOff')");
  });

  it('ships sendBtn copy for en/yue/zh/ja', () => {
    const prefs = read('lib/prefs.ts');
    expect(prefs).toContain("| 'sendBtn'");
    expect(prefs).toContain("sendBtn: { en: 'Send', yue: '傳送', zh: '发送', ja: '送信' }");
  });
});
