import { describe, expect, it } from 'vitest';
import {
  IDLE_JOINT_REFRESH_FADE_S,
  IDLE_JOINT_REFRESH_MS,
  nextIdleRefreshAt,
  shouldRefreshIdleJoints,
} from '../lib/idle-refresh';

describe('idle joint refresh', () => {
  it('exports a soft fade and ~28s period', () => {
    expect(IDLE_JOINT_REFRESH_MS).toBe(28_000);
    expect(IDLE_JOINT_REFRESH_FADE_S).toBeGreaterThan(0.5);
    expect(IDLE_JOINT_REFRESH_FADE_S).toBeLessThanOrEqual(1.5);
  });

  it('fires only when the deadline passes and the body is free', () => {
    expect(shouldRefreshIdleJoints(10_000, 9_000, false)).toBe(true);
    expect(shouldRefreshIdleJoints(10_000, 10_000, false)).toBe(true);
    expect(shouldRefreshIdleJoints(10_000, 11_000, false)).toBe(false);
    expect(shouldRefreshIdleJoints(10_000, 9_000, true)).toBe(false);
  });

  it('schedules the next refresh at least 8s out', () => {
    expect(nextIdleRefreshAt(1000)).toBe(1000 + IDLE_JOINT_REFRESH_MS);
    expect(nextIdleRefreshAt(1000, 500)).toBe(9000);
  });
});
