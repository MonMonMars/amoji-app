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

  /**
   * The line the speaker is on right now, or null. Read-only: it never starts,
   * stops or reorders anything. Poke resume snapshots this before it interrupts
   * so the cut conversation line can be picked back up afterwards.
   */
  activeItem(): T | null {
    return this.active;
  }

  /** Lines still waiting behind the active one, in play order. Read-only copy. */
  queuedItems(): T[] {
    return this.items.slice();
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
function speechLeadBody(text: string): string {
  return text.trim().replace(/[\s。.！!？?]+$/u, '');
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
    // Same lead body only when the next char is end / space / another closer.
    if (!after || /^[\s。.！!？?]/.test(after)) return false;
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
    if (/^[\s。.！!？?]/.test(after)) {
      return after.replace(/^[\s。.！!？?]+/u, '').trim();
    }
  }
  // Final reply diverged (scrub / preferLive swapped the line). Returning the
  // full string here stacked a second answer on top of the streamed lead —
  // "two LLM replies" / repeated content. Caller should stop + speak once.
  return '';
}

/** Normalized sentence key: letters+digits only, so wrappers/punctuation drift. */
function sentenceKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Text still to say when the streamed lead was already audible but the final
 * reply was RESHAPED around it (question capping, scrub, preferLive) so it no
 * longer literally starts with that sentence. Owner 2026-11-23: "now the
 * character always repeat the answers two times." The old two-way choice —
 * exact remainder, else speak the WHOLE reply again — replayed the opening
 * answer whenever only the wrapper changed ("Sure! …" → "Sure, …"). This
 * matches the leading sentence on normalized text and returns the rest; ''
 * when the reply says nothing beyond what was already heard.
 */
export function speechTailAfterLead(full: string, already: string): string {
  const t = full.trim();
  const f = already.trim();
  if (!t) return '';
  if (!f) return t;
  const direct = speechRemainder(t, f);
  if (direct) return direct;
  if (!speechLeadDiverged(t, f)) return ''; // the reply IS the lead — nothing left
  // Same opening words, reshaped wrapper: "Sure!" → "Sure, here are the steps."
  const body = speechLeadBody(f);
  if (body && t.startsWith(body)) {
    const after = t.slice(body.length).replace(/^[\s,，、;；:：—–。.！!？?\n]+/u, '').trim();
    if (after) return after;
  }
  const chunks = t.split(/(?<=[。．.！!？?])\s*/).map((s) => s.trim()).filter(Boolean);
  if (chunks.length < 2) return '';
  const key = sentenceKey(f);
  const first = sentenceKey(chunks[0]!);
  if (!key || !first) return '';
  const same = first === key || (first.length >= 4 && key.length >= 4 && (first.includes(key) || key.includes(first)));
  if (!same) return '';
  return chunks.slice(1).join(' ').trim();
}
