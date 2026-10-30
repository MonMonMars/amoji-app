import { describe, expect, it } from 'vitest';
import {
  estimateBpm,
  timeScaleForBpm,
  resolvePerfMotion,
  motionTagFor,
} from '../lib/performance-motion';

describe('performance-motion (t725–729)', () => {
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
    expect(p.bpm).toBe(72);
    expect(p.clipBpm).toBe(90);
    expect(p.timeScale).toBeLessThan(1);
    expect(p.preferredClipIds[0]).toBe('lib_C112');
    expect(p.fallbackClipIds).toEqual(['Sing']);
  });

  it('upbeat dance → C114, Dance fallback, timeScale > 1', () => {
    const p = resolvePerfMotion({ id: 'dance-silent-dance-floor', kind: 'dance', style: 'upbeat dance' });
    expect(p.tag).toBe('C114');
    expect(p.bpm).toBe(126);
    expect(p.clipBpm).toBe(100);
    expect(p.timeScale).toBeGreaterThan(1);
    expect(p.fallbackClipIds).toEqual(['Dance']);
  });

  it('disco / dj clip ids prefer DJ/HypeMan tags', () => {
    expect(motionTagFor('chill', 'dance', 'dance-8bit-disco')).toBe('C116');
    expect(motionTagFor('chill', 'dance', 'dj-night-mix')).toBe('C117');
    const disco = resolvePerfMotion({ id: 'dance-8bit-disco', kind: 'dance', style: 'upbeat dance' });
    expect(disco.tag).toBe('C116');
    expect(disco.preferredClipIds[0]).toBe('lib_C116');
  });
});
