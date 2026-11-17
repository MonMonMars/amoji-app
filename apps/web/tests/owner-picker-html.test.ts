import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '../../..');
const docs = path.join(repoRoot, 'docs');

describe('owner picker HTML (Pixel)', () => {
  it('docs/owner-resources.html is the canonical unified picker', () => {
    const p = path.join(docs, 'owner-resources.html');
    expect(fs.existsSync(p), p).toBe(true);
    const text = fs.readFileSync(p, 'utf8');
    expect(text).toContain('Owner resource library (unified)');
    expect(text).toContain('Copy JSON');
    expect(text).toContain('Fraunces');
    expect(text).toContain('data-tab="music"');
    expect(text).toContain('data-tab="poke"');
    expect(text).toContain('data-tab="idle"');
    expect(text).toContain('amoji.idlePick.v');
    expect(text).toContain('amoji.cmaReactionSfx.picks.v1');
    expect(text).toContain('tag in-use');
    expect(text).toContain('CHAT_IDLE_CURATED');
    expect(text).toContain('performance-clips.ts');
  });

  it('legacy picker HTML files redirect to owner-resources.html', () => {
    for (const [name, hash] of [
      ['owner-music-picker.html', 'music'],
      ['owner-poke-reactions.html', 'poke'],
      ['owner-idle-poses.html', 'idle'],
    ] as const) {
      const p = path.join(docs, name);
      expect(fs.existsSync(p), p).toBe(true);
      const text = fs.readFileSync(p, 'utf8');
      expect(text).toContain(`owner-resources.html#${hash}`);
    }
  });
});