/**
 * Idle blink clock — shared by both avatar kinds so live VRM 1.0 rigs blink
 * too. Before this the timer lived only in the legacy generic path; every VRM
 * (i.e. the whole roster) takes the V1 path, so none of them blinked.
 *
 * Deterministic when a `random` source is injected (tests). Returns the eyelid
 * weight for the frame: 0 = open, ~1 = closed at mid-blink.
 */
export class BlinkClock {
  private remaining: number;
  /** -1 = between blinks; >=0 = seconds into the current blink */
  private elapsed = -1;

  constructor(
    private readonly minDelaySec = 2.4,
    private readonly maxDelaySec = 5.0,
    private readonly durationSec = 0.16,
    private readonly random: () => number = Math.random,
  ) {
    this.remaining = this.nextDelay();
  }

  private nextDelay(): number {
    return this.minDelaySec + this.random() * (this.maxDelaySec - this.minDelaySec);
  }

  /** Skip any in-flight blink and schedule a fresh one (external blink won). */
  reset(): void {
    this.elapsed = -1;
    this.remaining = this.nextDelay();
  }

  /**
   * Advance one frame. The trigger frame returns 0 (lids start open); the
   * next frame begins the triangular close→open ramp.
   */
  update(dtSec: number): number {
    const dt = Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
    if (this.elapsed >= 0) {
      this.elapsed += dt;
      const k = this.elapsed / this.durationSec;
      if (k >= 1) {
        this.reset();
        return 0;
      }
      return 1 - Math.abs(k * 2 - 1);
    }
    this.remaining -= dt;
    if (this.remaining <= 0) this.elapsed = 0;
    return 0;
  }
}
