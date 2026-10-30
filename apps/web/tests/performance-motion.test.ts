import { describe, expect, it } from 'vitest';
import {
  estimateBpm,
  timeScaleForBpm,
  resolvePerfMotion,
  motionTagFor,
  trackBpmFor,
  timeScaleForProfile,
  clipBpmForTag,
} from '../lib/performance-motion';
import { measuredBpm } from '../lib/measured-bpm';
import { DANCE_CLIP_SOURCES, dancePerfClipSources } from '../lib/dance-clip-sources';

describe('performance-motion (t725-729 + measured BPM)', () => {
  it('estimates style BPM with sensible defaults', () => {
    expect(estimateBpm('soft ballad')).toBe(72);
    expect(estimateBpm('chill')).toBe(84);
    expect(estimateBpm('cute bounce')).toBe(108);
    expect(estimateBpm('upbeat dance')).toBe(126);
    expect(estimateBpm('mystery groove')).toBe(100);
  });

  it('clamps timeScale between 0.65 and 1.45', () => {
    expect(timeScaleForBpm(72, 90)).toBeCloseTo(0.8, 3);
    expect(timeScaleForBpm(126, 100)).toBeCloseTo(1.26, 3);
    expect(timeScaleForBpm(200, 100)).toBe(1.45);
    expect(timeScaleForBpm(30, 100)).toBe(0.65);
    expect(timeScaleForBpm(90, 90)).toBe(1);
  });

  it('soft ballad song → C112, Sing fallback, slower than 1', () => {
    const p = resolvePerfMotion({ id: 'sing-f-choir', kind: 'song', style: 'soft ballad' });
    expect(p.tag).toBe('C112');
    // choir has no high-confidence measured BPM → style 72
    expect(p.bpm).toBe(72);
    expect(p.bpmMeasured).toBe(false);
    expect(p.clipBpm).toBe(90);
    expect(p.preferredClipBpm).toBe(72);
    expect(p.timeScale).toBeLessThan(1);
    expect(p.preferredClipIds[0]).toBe('lib_C112');
    expect(p.fallbackClipIds).toEqual(['Sing']);
  });

  it('upbeat dance uses measured BPM when available', () => {
    const p = resolvePerfMotion({ id: 'dance-silent-dance-floor', kind: 'dance', style: 'upbeat dance' });
    expect(p.tag).toBe('C114');
    expect(p.bpmMeasured).toBe(true);
    expect(p.bpm).toBe(measuredBpm('dance-silent-dance-floor'));
    expect(p.clipBpm).toBe(100);
    expect(p.fallbackClipIds).toEqual(['Dance']);
  });

  it('disco / dj clip ids prefer DJ/HypeMan tags', () => {
    expect(motionTagFor('chill', 'dance', 'dance-8bit-disco')).toBe('C116');
    expect(motionTagFor('chill', 'dance', 'dj-night-mix')).toBe('C117');
    const disco = resolvePerfMotion({ id: 'dance-8bit-disco', kind: 'dance', style: 'upbeat dance' });
    expect(disco.tag).toBe('C116');
    expect(disco.preferredClipIds[0]).toBe('lib_C116');
    expect(disco.bpmMeasured).toBe(true);
  });

  it('trackBpmFor prefers measured over style', () => {
    const m = measuredBpm('dance-8bit-disco');
    expect(m).toBeTypeOf('number');
    const t = trackBpmFor('upbeat dance', 'dance-8bit-disco');
    expect(t.measured).toBe(true);
    expect(t.bpm).toBe(m);
    const styleOnly = trackBpmFor('upbeat dance', 'no-such-clip');
    expect(styleOnly.measured).toBe(false);
    expect(styleOnly.bpm).toBe(126);
  });

  it('timeScaleForProfile uses preferredClipBpm for lib_C*', () => {
    const p = resolvePerfMotion({ id: 'dance-8bit-disco', kind: 'dance', style: 'upbeat dance' });
    const viaFallback = timeScaleForProfile(p, 'Dance');
    const viaPreferred = timeScaleForProfile(p, 'lib_C116');
    expect(viaFallback).toBe(timeScaleForBpm(p.bpm, p.clipBpm));
    expect(viaPreferred).toBe(timeScaleForBpm(p.bpm, p.preferredClipBpm));
    expect(clipBpmForTag('C116')).toBe(118);
  });
});

describe('dance-clip-sources interim remotes', () => {
  it('lists shortlist and builds ANIM_MIRROR-first URLs', () => {
    expect(DANCE_CLIP_SOURCES.length).toBeGreaterThanOrEqual(12);
    const interim = DANCE_CLIP_SOURCES.filter((s) => s.status === 'interim-remote');
    expect(interim.map((s) => s.id).sort()).toEqual(['lib_C03', 'lib_C110', 'lib_C61', 'lib_C62']);
    const sources = dancePerfClipSources('/models/anims');
    const twist = sources.find((s) => s.id === 'lib_C110')!;
    expect(twist.urls[0]).toBe('/models/anims/lib_C110.vrma');
    expect(twist.urls.some((u) => u.includes('twistDance.vrma'))).toBe(true);
    const sway = sources.find((s) => s.id === 'lib_C112')!;
    expect(sway.urls).toEqual(['/models/anims/lib_C112.vrma']);
  });
});
