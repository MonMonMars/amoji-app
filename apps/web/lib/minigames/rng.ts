/** Tiny deterministic RNG so flee zig-zags and lane rows are testable. */

export function nextUnit(seed: number): { value: number; seed: number } {
  let a = seed | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: a >>> 0 };
}
