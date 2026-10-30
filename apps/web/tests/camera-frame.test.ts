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
  });

  it('ships a calm default home', () => {
    expect(DEFAULT_CAMERA_HOME.lookY).toBeCloseTo(1.05);
    expect(DEFAULT_CAMERA_HOME.dist).toBeCloseTo(2.6);
  });
});
