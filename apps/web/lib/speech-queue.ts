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

/** Text still to say after `already` was queued as the first sentence. */
export function speechRemainder(full: string, already: string): string {
  const t = full.trim();
  const f = already.trim();
  if (!f) return t;
  if (t === f) return '';
  if (t.startsWith(f)) return t.slice(f.length).trim();
  return t;
}
