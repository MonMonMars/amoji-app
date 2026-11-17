import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '../../..');

describe('owner picker HTML (Pixel)', () => {
  it('docs/owner-music-picker.html and docs/owner-poke-reactions.html exist', () => {
    for (const name of ['owner-music-picker.html', 'owner-poke-reactions.html']) {
      const p = path.join(repoRoot, 'docs', name);
      expect(fs.existsSync(p), p).toBe(true);
      const text = fs.readFileSync(p, 'utf8');
      expect(text).toContain('Copy JSON');
      expect(text).toContain('Fraunces');
    }
  });
});