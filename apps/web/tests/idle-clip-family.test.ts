import { describe, expect, it } from 'vitest';
import {
  IDLE_INCOMPAT_CROSSFADE_S,
  idleClipFamily,
  idleCrossfadeCompatible,
} from '../lib/idle-clip-family';
import {
  resolveIdleClipForPlay,
  resolveIdleClipId,
} from '../lib/idle-retired';
import { idleArmRewriteAllowed } from '../lib/idle-stance-soften';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

describe('idle clip family + unstrange pose blend', () => {
  it('tags Quaternius / RPM / Mixamo as distinct families', () => {
    expect(idleClipFamily('IdleQuaterniusHuman')).toBe('quaternius');
    expect(idleClipFamily('IdleRpmFStanding001')).toBe('rpm');
    expect(idleClipFamily('IdleMixamoBreathing')).toBe('mixamo');
    expect(idleCrossfadeCompatible('IdleQuaterniusHuman', 'IdleRpmFStanding001')).toBe(false);
    expect(idleCrossfadeCompatible('IdleRpmFStanding001', 'IdleRpmMStanding001')).toBe(true);
    expect(IDLE_INCOMPAT_CROSSFADE_S).toBeLessThan(0.5);
  });

  it('honors owner RPM pin on play without remapping to Quaternius', () => {
    // Owner-picks-win: honorable stands never remap (even without honorOwnerPin).
    expect(resolveIdleClipId('IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipForPlay('IdleRpmFStanding001', { honorOwnerPin: true }))
      .toBe('IdleRpmFStanding001');
    expect(resolveIdleClipForPlay('IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipForPlay('IdleBreathCalm', { honorOwnerPin: true }))
      .toBe('IdleQuaterniusHuman');
  });

  it('blocks arm soften/hang rewrite on calm upright stands', () => {
    expect(idleArmRewriteAllowed('IdleQuaterniusHuman')).toBe(false);
    expect(idleArmRewriteAllowed('IdleRpmFStanding001')).toBe(false);
    expect(idleArmRewriteAllowed('IdleMixamoBreathing')).toBe(false);
    expect(idleArmRewriteAllowed('IdleMixamoExcited')).toBe(true);
  });

  it('CompanionCanvas clears poke lean and gates hang on calm idles', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('resolveIdleClipForPlay');
    expect(canvas).toContain('honorOwnerPin');
    expect(canvas).toContain('idleCrossfadeCompatible');
    expect(canvas).toContain('idleArmRewriteAllowed');
    expect(canvas).toContain('clearPlantLean');
    expect(canvas).toMatch(/allowArmRewrite[\s\S]*easeIdleHang/);
    expect(canvas).toMatch(/boost === 0\) \{\s*\n\s*avatar\.clearPlantLean/);
    expect(canvas).toContain('pullIdleTorsoUpright');
    expect(canvas).toMatch(/calmClipNow[\s\S]*pullIdleTorsoUpright/);
  });
});
