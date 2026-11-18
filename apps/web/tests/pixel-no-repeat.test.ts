import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PHASE_BUTTONS,
  DEMO_PHASE_LEFT_PRIORITY_IDS,
  DEMO_PHASE_TAIL_SHUFFLE_ENABLED,
  demoPhasePrompt,
  shuffledDemoPhaseButtons,
} from '../lib/demo-phase';
import { planTools } from '../lib/live-tools';
import { resolveMusicAsk } from '../lib/music-ask';
import { pickStreamTrack } from '../lib/music-catalog';
import { isTopicalContentTurn } from '../lib/skill-offer-guard';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Pixel no-repeat regressions', () => {
  it('demo-phase tail shuffle is explicit — never Fisher–Yates the full rail', () => {
    expect(DEMO_PHASE_TAIL_SHUFFLE_ENABLED).toBe(true);
    const src = read('lib/demo-phase.ts');
    expect(src).toContain('DEMO_PHASE_LEFT_PRIORITY_IDS');
    expect(src).toContain('demoPhaseTailButtons');
    expect(src).not.toContain('const arr = [...DEMO_PHASE_BUTTONS]');
    for (const seed of [7, 8080]) {
      const ids = shuffledDemoPhaseButtons(seed).map((b) => b.id);
      expect(ids.slice(0, 2)).toEqual([...DEMO_PHASE_LEFT_PRIORITY_IDS]);
      expect(new Set(ids).size).toBe(DEMO_PHASE_BUTTONS.length);
    }
  });
  it('news + weather demo taps gather live facts and speak (send() clientLiveContext)', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('await clientLiveContext(text, lang');
    expect(panel).toContain('worldSpoken = live.spoken');
    expect(panel).toMatch(/speak\(line, characterId, lang/);
    for (const id of ['weather', 'news'] as const) {
      const p = demoPhasePrompt(id, 'en', 0);
      expect(isTopicalContentTurn(p)).toBe(true);
      expect(planTools(p).weather || planTools(p).news).toBe(true);
    }
  });
  it('stopSpeakingForCardAudition halts browser synth only — no same-gesture stopGtts (card voice)', () => {
    const voice = read('lib/voice.ts');
    const start = voice.indexOf('export function stopSpeakingForCardAudition');
    const end = voice.indexOf('export function speakThinkingFiller', start);
    const helper = voice.slice(start, end);
    expect(helper).toContain('haltBrowserSynth()');
    expect(helper).not.toContain('haltSynthQueue()');
    expect(helper).not.toContain('stopGtts()');
  });
  it('idle visible motion guards stay wired (frozen idle regression)', () => {
    const canvas = read('components/CompanionCanvas.tsx');
    expect(canvas).toContain('dampenIdleClipAmplitude(clip)');
    expect(canvas).toContain('mixer?.update(dt / 1000)');
    expect(read('lib/idle-amplitude.ts')).toMatch(/IDLE_BODY_AMPLITUDE\s*=\s*0\.[3-9]/);
  });
  it('taichi lib_C121 stays foot-planted + looped (arm freeze regression)', () => {
    const canvas = read('components/CompanionCanvas.tsx');
    expect(canvas).toMatch(/taichi:\s*'lib_C121'/);
    expect(canvas).toContain('LoopRepeat');
    expect(read('lib/vrm/plant-feet.ts')).toMatch(/lib_C121/);
  });
  it('yue hip-hop ask resolves hiphop stream — not unrelated pop MV', () => {
    expect(resolveMusicAsk('有冇hip hop音樂')).toMatchObject({ style: 'hiphop', matched: true });
    const track = pickStreamTrack('hiphop', 0);
    expect(track?.style).toBe('hiphop');
    expect(track?.title ?? '').toMatch(/Hip Hop|hip-hop/i);
  });
  it('owner-resources Mixkit preview distinguishes CDN block vs missing local file', () => {
    const html = fs.readFileSync(path.join(REPO, 'docs/owner-resources.html'), 'utf8');
    expect(html).toMatch(/Mixkit stream previews|mixkit\.co/i);
    if (html.includes('Mixkit CDN')) expect(html).toContain('missing');
    else expect(html).toMatch(/play-remote|motion-preview--missing/);
  });
});
