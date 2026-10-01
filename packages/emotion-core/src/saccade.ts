export interface SaccadeClock {
  tick(dtMs: number, arousal: number): { moved: boolean; x: number; y: number };
}

export function createSaccadeClock(opts: { minMs: number; maxMs: number }, rng: () => number): SaccadeClock {
  let untilNext = 0;
  let gaze = { x: 0, y: 0 };
  const interval = (arousal: number): number => {
    const t = Math.min(1, Math.max(0, (arousal + 1) / 2)); // [-1,1] → [0,1]
    return opts.maxMs - t * (opts.maxMs - opts.minMs);
  };
  return {
    tick(dtMs: number, arousal: number) {
      untilNext -= dtMs;
      if (untilNext > 0) return { moved: false, ...gaze };
      untilNext = interval(arousal) * (0.5 + rng());
      gaze = { x: (rng() * 2 - 1) * 0.6, y: (rng() * 2 - 1) * 0.4 };
      return { moved: true, ...gaze };
    },
  };
}
