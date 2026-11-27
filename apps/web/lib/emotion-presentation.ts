// Expression presentation — how a face change *reads*, not what it contains.
//
// The emotion engine is deliberately polite: every face param eases toward its
// target with a 250 ms time constant, so a strong emotion arrives as a soft
// fade and the eye barely registers it. This layer sits on the finished weight
// and adds a small onset punch: on the rising edge of a genuinely strong
// emotion it drives ~120 ms to a little past the target (1.15–1.3×), holds
// that peak briefly, then settles back to exactly the target weight.
//
// Pure and deterministic for a given (target, now) sequence so the maths can be
// tested without a renderer. Nothing here changes the emotion data or decay.

export interface PunchOptions {
  /** Only a target at or above this weight punches (a mild mood still fades). */
  threshold?: number;
  /** Peak multiplier. 1.22 = 22% past the target, visibly a beat not a glitch. */
  gain?: number;
  /** Rising edge → peak. */
  attackMs?: number;
  /** Hold the peak before settling. */
  holdMs?: number;
  /** Peak → target. */
  settleMs?: number;
  /** A channel cannot punch again inside this window. */
  cooldownMs?: number;
}

export interface ExpressionPresenter {
  /** Weight to write this frame for `name` (0..1). */
  present(name: string, target: number, nowMs: number): number;
  reset(): void;
}

interface ChannelState {
  /** Previous RAW target, used to detect the rising edge. */
  prevTarget: number;
  /** Timestamp the current punch started, or -1 when idle. */
  punchAt: number;
  /** Timestamp of the last punch, for the cooldown. */
  lastPunchAt: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** 0 → 1 → hold → 1 → 0 envelope for a punch that started `elapsed` ms ago. */
export function punchEnvelope(
  elapsed: number,
  attackMs: number,
  holdMs: number,
  settleMs: number,
): number {
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  const attack = Math.max(1, attackMs);
  const hold = Math.max(0, holdMs);
  const settle = Math.max(1, settleMs);
  if (elapsed < attack) return smoothstep(elapsed / attack);
  if (elapsed < attack + hold) return 1;
  if (elapsed < attack + hold + settle) {
    return 1 - smoothstep((elapsed - attack - hold) / settle);
  }
  return 0;
}

export function createExpressionPresenter(options: PunchOptions = {}): ExpressionPresenter {
  const threshold = options.threshold ?? 0.45;
  const gain = Math.max(1, options.gain ?? 1.22);
  const attackMs = options.attackMs ?? 120;
  const holdMs = options.holdMs ?? 120;
  const settleMs = options.settleMs ?? 200;
  const cooldownMs = options.cooldownMs ?? 900;
  const channels = new Map<string, ChannelState>();

  return {
    present(name: string, rawTarget: number, nowMs: number): number {
      const target = clamp01(Number.isFinite(rawTarget) ? rawTarget : 0);
      const now = Number.isFinite(nowMs) ? nowMs : 0;
      let state = channels.get(name);
      if (!state) {
        state = { prevTarget: 0, punchAt: -1, lastPunchAt: -Infinity };
        channels.set(name, state);
      }
      // Rising edge through the strength gate, and not still cooling down.
      if (
        target >= threshold
        && state.prevTarget < threshold
        && now - state.lastPunchAt >= cooldownMs
      ) {
        state.punchAt = now;
        state.lastPunchAt = now;
      }
      state.prevTarget = target;

      if (state.punchAt < 0) return target;
      const elapsed = now - state.punchAt;
      const env = punchEnvelope(elapsed, attackMs, holdMs, settleMs);
      // `elapsed === 0` is the trigger frame (env is 0 by definition) — do not
      // cancel the punch there, only once the envelope has actually run out.
      if (env <= 0 && elapsed > 0) {
        state.punchAt = -1;
        return target;
      }
      return clamp01(target * (1 + (gain - 1) * env));
    },
    reset(): void {
      channels.clear();
    },
  };
}
