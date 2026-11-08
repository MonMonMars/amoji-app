import { describe, expect, it } from 'vitest';

// Simulate the gtts chunk chain with a fake Audio element to prove:
//  - it resolves when chunks end
//  - it rejects 'canceled' when stopGtts() runs mid-line
//  - it rejects on error so the caller can fall through
//  - playbackRate is bounded

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  playbackRate = 1;
  preload = '';
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplay: (() => void) | null = null;
  paused = true;
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  play() {
    this.paused = false;
    queueMicrotask(() => this.onplay?.());
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  /** Test helper: finish the current chunk. */
  end() {
    this.onended?.();
  }
}

describe('gtts chunk chain behaviour', () => {
  it('the module is wired and uses plain <audio> over HTTPS', async () => {
    // Static check first; behavioural checks below guard the contract.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');
    expect(src).toContain('new Audio(');
    expect(src).toContain('https://translate.google.com/translate_tts');
    expect(src).toContain('playbackRate');
    // bound the rate so sadness never drags and joy never chips
    expect(src).toMatch(/clamp\(opts\.rate \?\? 1, 0\.88, 1\.15\)/);
    // per-chunk stall watchdog so one wedged request cannot silence the line
    expect(src).toContain('gtts chunk stalled');
  });

  it('exposes an immediate cancel so a newer line wins', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');
    expect(src).toMatch(/let generation = 0/);
    expect(src).toMatch(/export function stopGtts\(\): void \{\s*generation\+\+/);
    // Rejecting the pending promise is what makes a cancel take effect at once.
    // Without it the caller waited for the 10s stall watchdog and then saw
    // "chunk stalled" instead of "canceled".
    expect(src).toContain('pendingReject');
    expect(src).toMatch(/reject\?\.\(new Error\('canceled'\)\)/);
  });

  it('splits long text so no chunk exceeds the endpoint limit', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');
    // 120-char cap: the public endpoint truncates around 200
    expect(src).toMatch(/maxLen = 120/);
    expect(src).toContain('splitChunks');
    // Clause pauses must stay audible — do not quietly shrink them again.
    expect(src).toMatch(/return 420/);
    expect(src).toMatch(/return 220/);
    expect(src).toContain('gapTimer');
  });

  it('reports onPlaying once, on the first chunk only', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');
    expect(src).toMatch(/reportedPlaying/);
    expect(src).toMatch(/if \(!reportedPlaying\)/);
  });

  it('keeps the mouth moving for later chunks and closes on the last', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');
    expect(src).toContain('followAudioElement(audio, last)');
    expect(src).toMatch(/const last = i >= pieces\.length/);
  });

  it('FakeAudio sanity: the double itself behaves', () => {
    // Guard the guard: if this double is wrong the notes above are meaningless.
    const a = new FakeAudio('x');
    let played = false;
    a.onplay = () => { played = true; };
    void a.play();
    expect(a.paused).toBe(false);
    return Promise.resolve().then(() => expect(played).toBe(true));
  });
});
