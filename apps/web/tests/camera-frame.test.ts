import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA_HOME, upperBodyHome } from '../lib/camera-frame';

describe('upperBodyHome', () => {
  it('keeps a stable upper-body look for short and tall torsos', () => {
    const short = upperBodyHome({ hipsY: 0.9, chestY: 1.15, headY: 1.45 });
    const tall = upperBodyHome({ hipsY: 1.0, chestY: 1.35, headY: 1.75 });
    expect(short.lookY).toBeGreaterThan(1.0);
    expect(tall.lookY).toBeGreaterThan(short.lookY);
    expect(tall.dist).toBeGreaterThan(short.dist);
    expect(short.dist).toBeGreaterThanOrEqual(2.15);
    expect(tall.dist).toBeLessThanOrEqual(3.45);
    expect(short.lookX).toBe(0);
    expect(tall.lookX).toBe(0);
  });

  it('ships a calm default home', () => {
    expect(DEFAULT_CAMERA_HOME.lookX).toBe(0);
    expect(DEFAULT_CAMERA_HOME.lookY).toBeCloseTo(1.05);
    expect(DEFAULT_CAMERA_HOME.dist).toBeCloseTo(2.6);
  });

  it('centers lookX on torso X and clamps extremes', () => {
    const lean = upperBodyHome({
      hipsY: 0.95,
      chestY: 1.25,
      headY: 1.55,
      hipsX: 0.12,
      chestX: 0.18,
    });
    expect(lean.lookX).toBeGreaterThan(0.1);
    expect(lean.lookX).toBeLessThanOrEqual(0.22);
    const wild = upperBodyHome({
      hipsY: 0.95,
      chestY: 1.25,
      headY: 1.55,
      hipsX: 0.8,
      chestX: 0.9,
    });
    expect(wild.lookX).toBe(0.22);
    const left = upperBodyHome({
      hipsY: 0.95,
      chestY: 1.25,
      headY: 1.55,
      hipsX: -0.5,
      chestX: -0.6,
    });
    expect(left.lookX).toBe(-0.22);
  });
});
