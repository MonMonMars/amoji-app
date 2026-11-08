import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('enter-chat name voice', () => {
  it('seeds profile name into memory and greets with it', () => {
    const mem = read('lib/memory.ts');
    expect(mem).toContain('ensureUserNameFromProfile');
    expect(mem).toContain('buildEnterNameGreeting');
    const chat = read('components/ChatPanel.tsx');
    expect(chat).toContain('ensureUserNameFromProfile(loadProfile().name)');
    expect(chat).toContain('buildEnterNameGreeting');
    expect(chat).toContain('namedHello');
  });

  it('one-click START syncs the profile name into memory', () => {
    const boot = read('lib/one-click-setup.ts');
    expect(boot).toContain('ensureUserNameFromProfile(name)');
  });

  it('ChatPanel arms open-cheer latch once (Strict Mode remount safe)', () => {
    const chat = read('components/ChatPanel.tsx');
    expect(chat).toContain('openCheerAlreadyDone');
    expect(chat).toContain('markOpenCheerDone');
    expect(chat).toContain('openCheerAlreadyDone(characterId)');
    expect(chat).toContain('if (skipCheer)');
    // Latch must be read before bumping lastOpenedAt.
    const skipIdx = chat.indexOf('openCheerAlreadyDone(characterId)');
    const openIdx = chat.indexOf('markChatRoomOpened()', skipIdx);
    expect(skipIdx).toBeGreaterThan(-1);
    expect(openIdx).toBeGreaterThan(skipIdx);
  });
});
