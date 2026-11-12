import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  armPerfDance,
  refreshPendingPerfDance,
  shouldStartDanceOnAudioPlaying,
} from '../lib/dance-audio-gate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('dance-audio-gate', () => {
  it('does not start dance until a playing id arrives', () => {
    const pending = armPerfDance('dance', 12_000, 'dance-happy-loop');
    expect(shouldStartDanceOnAudioPlaying(null, 'dance-happy-loop')).toBe(false);
    expect(shouldStartDanceOnAudioPlaying(pending, null)).toBe(false);
    expect(shouldStartDanceOnAudioPlaying(pending, '')).toBe(false);
    expect(shouldStartDanceOnAudioPlaying(pending, 'dance-happy-loop')).toBe(true);
  });

  it('refreshPendingPerfDance updates hold and clip while armed', () => {
    const pending = armPerfDance('sing', 9_000, 'old-id');
    const next = refreshPendingPerfDance(pending, 'new-id', 40_000);
    expect(next).toEqual({ bodyMove: 'sing', holdMs: 40_000, clipId: 'new-id' });
    expect(refreshPendingPerfDance(null, 'x', 1)).toBeNull();
  });

  it('ChatPanel arms dance for audio playing — not intro / press', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('armPerfDance');
    expect(panel).toContain('shouldStartDanceOnAudioPlaying');
    expect(panel).toContain('pendingShowDanceRef');
    // beginShow must not triggerMove before whenSpeechIdle / playing.
    const begin = panel.slice(panel.indexOf('const beginShow ='), panel.indexOf('const speakReply'));
    expect(begin).toContain('armPerfDance(bodyMove');
    expect(begin).not.toMatch(/triggerMove\(bodyMove\)/);
    expect(begin).toContain('startLibraryPerformance(query)');
    // Body starts from library-clip playing handler.
    expect(panel).toMatch(/shouldStartDanceOnAudioPlaying[\s\S]*triggerMove\(pending\.bodyMove\)/);
  });

  it('music.ts emits playing after audible start (not fetch alone)', () => {
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    expect(music).toContain('emitLibraryClipPlaying');
    expect(music).toContain("addEventListener('playing'");
    expect(music).toContain('currentTime > 0');
    expect(music).toContain('startLibraryBandFallback');
    // BufferSource emits only after src.start().
    const playClip = music.slice(music.indexOf('async function playClip'), music.indexOf('function streamDanceClip'));
    expect(playClip.indexOf('src.start()')).toBeLessThan(playClip.indexOf('emitLibraryClipPlaying(clip.id)'));
  });
});
