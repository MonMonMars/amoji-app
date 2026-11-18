import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { IDLE_BODY_AMPLITUDE, IDLE_PLAYBACK_TIME_SCALE } from '../lib/idle-amplitude';
import { IDLE_CALM_TORSO_PITCH_MAX } from '../lib/idle-stance-soften';
import { IDLE_VISIBLE_MIN_PLAYBACK } from '../lib/idle-v2-visible';

const root = path.resolve(import.meta.dirname, '..');

/** r217: idle must read alive on Pixel calm stands (v6 pick + chat-auto-idle). */
describe('idle visible motion (r217)', () => {
  it('CompanionCanvas applies calm torso cap with visible VRMA amp', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('IDLE_CALM_TORSO_PITCH_MAX');
    expect(canvas).toContain('dampenIdleClipAmplitude(clip)');
    expect(canvas).toContain('mixer?.update(dt / 1000)');
    expect(IDLE_BODY_AMPLITUDE).toBeGreaterThan(0.25);
    expect(IDLE_PLAYBACK_TIME_SCALE).toBeGreaterThan(0.6);
    expect(IDLE_CALM_TORSO_PITCH_MAX).toBeGreaterThan(0.08);
    expect(IDLE_VISIBLE_MIN_PLAYBACK).toBeGreaterThanOrEqual(0.55);
    expect(canvas).toContain('orderIdleV2VisibleClips');
  });
});