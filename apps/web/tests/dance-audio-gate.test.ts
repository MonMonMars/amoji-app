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

  it('explicit sing/dance send short-circuits before LLM (no double beginShow / stopMusic)', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    const block = panel.slice(
      panel.indexOf("if (requested === 'sing' || requested === 'dance')"),
      panel.indexOf('setThinkingPose(true)'),
    );
    expect(block).toContain('beginShow(');
    expect(block).toContain('done()');
    expect(block).toContain('return');
    expect(block).not.toContain('setThinkingPose(true)');
  });

  it('typed / chip / showcase song-dance do not triggerMove before beginShow', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    // Showcase yes → song/dance: beginShow only (no pre-arm triggerMove).
    const showcase = panel.slice(
      panel.indexOf("if (kind === 'music')"),
      panel.indexOf('pendingOfferRef.current = null; // any other answer'),
    );
    expect(showcase).toContain('beginShow(kind === \'song\' ? \'song\' : \'dance\'');
    expect(showcase).not.toMatch(/triggerMove\(kind === 'song'/);
    // Random sing/dance short-circuit beginShow (no LLM / no early triggerMove).
    expect(panel).toMatch(/ask\.kind === 'music' \|\| ask\.kind === 'song' \|\| ask\.kind === 'dance'/);
    expect(panel).not.toMatch(/triggerMove\(requested\)/);
  });

  it('music.ts emits playing after audible start (not fetch alone)', () => {
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    expect(music).toContain('emitLibraryClipPlaying');
    expect(music).toContain("addEventListener('playing'");
    expect(music).toContain('currentTime > 0');
    expect(music).toContain('startLibraryBandFallback');
    const playEl = music.slice(music.indexOf('function playClipElement'), music.indexOf('async function playClip'));
    expect(playEl).toContain('primeLibraryBedPlayback');
    expect(playEl).toContain("startHtmlAudioOnDefaultSpeakers(audio, 'gesture-safe')");
    expect(music).toMatch(/function primeLibraryBedPlayback[\s\S]*ensureCompanionPlaybackRoute/);
    expect(playEl).not.toMatch(/pinDefaultOutput\(audio\)/);
    expect(playEl).not.toMatch(/pinDefaultOutputAsync\(audio\)\.then\(\(\) => audio\.play/);
    // BufferSource emits only after src.start().
    const playClip = music.slice(music.indexOf('async function playClip'), music.indexOf('function streamDanceClip'));
    expect(playClip.indexOf('src.start()')).toBeLessThan(playClip.indexOf('emitLibraryClipPlaying(clip.id)'));
    // Song mouth starts only after audible start — never during intro wait.
    expect(playClip.indexOf('src.start()')).toBeLessThan(playClip.indexOf('startSongMouth'));
    expect(music).toContain('armSongMouthFromElement');
    expect(music).toMatch(/clipKind === 'song'[\s\S]*armSongMouthFromElement/);
  });

  it('CompanionCanvas retries sing/dance playPerf until VRMA loads', () => {
    const canvas = fs.readFileSync(path.join(ROOT, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('if (playPerf(clipName)) mvHandled = mv.kind');
    expect(canvas).toContain('Hard fallbacks so song/dance still move');
    // Local Sing/Dance before remote 3dchat URLs.
    const singLocal = canvas.indexOf('`${ANIM_MIRROR}/Sing.vrma`');
    const singRemote = canvas.indexOf('singing.vrma');
    expect(singLocal).toBeGreaterThan(0);
    expect(singLocal).toBeLessThan(singRemote);
    const danceLocal = canvas.indexOf('`${ANIM_MIRROR}/Dance.vrma`');
    const danceRemote = canvas.indexOf('hipHopDancing.vrma');
    expect(danceLocal).toBeGreaterThan(0);
    expect(danceLocal).toBeLessThan(danceRemote);
  });
});
