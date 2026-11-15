/**
 * Pixel: personality CATCH / WRAP / shy idle must never prepend spoken
 * loading UM onto spoken lines.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emotionClipKind, loadingFillerKind } from '../lib/voice-clips';

const web = join(__dirname, '..');
const src = () => readFileSync(join(web, 'lib/personality-voice.ts'), 'utf8');

/** Drop // comments so assertions only see spoken string templates. */
function codeOnly(block: string): string {
  return block.replace(/\/\/[^\n]*/g, '');
}

function section(name: 'CATCH' | 'WRAP', voice: string): string {
  const re = new RegExp(`const ${name}[\\s\\S]*?${voice}:\\s*\\{([\\s\\S]*?)\\n  \\},`);
  const hit = src().match(re);
  if (!hit?.[1]) throw new Error(`missing ${name} ${voice}`);
  return codeOnly(hit[1]);
}

describe('personality — no loading UM leads', () => {
  it('shy CATCH has no um/嗯/えっと openers', () => {
    const block = section('CATCH', 'shy');
    expect(block).not.toMatch(/['`]um\b/i);
    expect(block).not.toMatch(/嗯/);
    expect(block).not.toMatch(/えっと/);
    expect(block).not.toMatch(/あの……/);
  });

  it('shy WRAP has no Um/嗯/あの templates', () => {
    const block = section('WRAP', 'shy');
    expect(block).not.toMatch(/['`]Um\b/);
    expect(block).not.toMatch(/['`]um\b/i);
    expect(block).not.toMatch(/嗯/);
    expect(block).not.toMatch(/あの……/);
    expect(block).not.toMatch(/えっと/);
  });

  it('quiet WRAP / CATCH has no 嗯/Hm loading openers', () => {
    const wrap = section('WRAP', 'quiet');
    const catchBlock = section('CATCH', 'quiet');
    expect(wrap).not.toMatch(/嗯/);
    expect(wrap).not.toMatch(/['`]Hm\b/);
    expect(catchBlock).not.toMatch(/嗯/);
    expect(catchBlock).not.toMatch(/['`]hm\b/i);
  });

  it('shy idle bank has no Um/嗯，/えっと openers', () => {
    expect(src()).not.toMatch(/Um, talking about/);
    expect(src()).not.toMatch(/嗯，講起/);
    expect(src()).not.toMatch(/嗯，说起/);
    expect(src()).not.toMatch(/えっと、\{noun\}の話/);
  });

  it('replacement shy leads are not loading-filler kinds', () => {
    for (const lead of ['Softly…', '細細聲……', '轻轻……', 'すこし……', 'softly, tea…']) {
      expect(loadingFillerKind(lead), lead).toBeNull();
      expect(emotionClipKind(lead, 'lead'), lead).not.toBe('um');
      expect(emotionClipKind(lead, 'lead'), lead).not.toBe('think');
      expect(emotionClipKind(lead, 'lead'), lead).not.toBe('search');
    }
  });
});
