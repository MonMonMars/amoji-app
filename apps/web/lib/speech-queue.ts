// Companion lines play to the end, in order. Only a user interrupt
// (mic / the user sending a turn) drops the queue and cuts the current line.

export class LineQueue<T> {
  private items: T[] = [];
  private playing = false;
  private epoch = 0;
  private active: T | null = null;

  pending(): boolean {
    return this.playing || this.items.length > 0;
  }

  includes(pred: (item: T) => boolean): boolean {
    if (this.active && pred(this.active)) return true;
    return this.items.some(pred);
  }

  /** Drop the queue and the active line. In-flight work must observe the new epoch. */
  interrupt(): number {
    this.epoch += 1;
    this.items = [];
    this.active = null;
    this.playing = false;
    return this.epoch;
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  /**
   * Drop queued items that match, and the active one too. Dropping the active
   * item bumps the epoch, so whatever is already playing observes a stale
   * epoch and stops. Returns true when the speaker was taken from that item.
   */
  drop(pred: (item: T) => boolean): boolean {
    this.items = this.items.filter((item) => !pred(item));
    if (!this.active || !pred(this.active)) return false;
    this.epoch += 1;
    this.active = null;
    this.playing = false;
    return true;
  }

  epochNow(): number {
    return this.epoch;
  }

  /** Take the next line when nothing is playing. Null while a line is in progress. */
  begin(): { item: T; epoch: number } | null {
    if (this.playing) return null;
    const item = this.items.shift();
    if (!item) return null;
    this.playing = true;
    this.active = item;
    return { item, epoch: this.epoch };
  }

  /** Release the player so the next queued line can start. Stale epochs are ignored. */
  finished(epoch: number): void {
    if (epoch !== this.epoch) return;
    this.playing = false;
    this.active = null;
  }
}

/** Drop trailing sentence closers so "." vs "!" still counts as one lead. */
export function speechLeadBody(text: string): string {
  return text.trim().replace(/[\s。.！!？?]+$/u, '');
}

/** True when the streamed lead continues inline (CJK has no space after the lead body). */
function leadContinuesInline(after: string): boolean {
  if (!after) return true;
  if (/^[\s。.！!？?，,、]/.test(after)) return true;
  return /^[\u3400-\u9fff]/.test(after);
}

function sliceLeadRemainder(after: string): string {
  if (!after) return '';
  return after.replace(/^[\s。.！!？?，,、]+/u, '').trim();
}

/**
 * True when the final reply no longer continues the streamed first sentence.
 * Closer-only punctuation drift ("Hello." → "Hello!") is NOT a divergence —
 * treating it as one used to cut + re-speak sentence one.
 */
export function speechLeadDiverged(full: string, already: string): boolean {
  const t = full.trim();
  const f = already.trim();
  if (!f || !t) return false;
  if (t === f || t.startsWith(f)) return false;
  const body = speechLeadBody(f);
  if (!body) return true;
  if (t === body || t.startsWith(body)) {
    const after = t.slice(body.length);
    if (leadContinuesInline(after)) return false;
  }
  return true;
}

/** Text still to say after `already` was queued as the first sentence. */
export function speechRemainder(full: string, already: string): string {
  const t = full.trim();
  const f = already.trim();
  if (!f) return t;
  if (t === f) return '';
  if (t.startsWith(f)) return t.slice(f.length).trim();
  const body = speechLeadBody(f);
  if (body && (t === body || t.startsWith(body))) {
    const after = t.slice(body.length);
    if (!after) return '';
    if (leadContinuesInline(after)) return sliceLeadRemainder(after);
  }
  // Final reply diverged (scrub / preferLive swapped the line). Returning the
  // full string here stacked a second answer on top of the streamed lead —
  // "two LLM replies" / repeated content. Caller should stop + speak once.
  return '';
}