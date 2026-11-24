/**
 * Owner report 2026-11-25: scrolling the select board said "hi"/"hello" over and
 * over, many greetings at once. Two requirements:
 *
 *   1. Scrolling must never greet. Only a deliberate tap / Enter / Space on a
 *      card may speak — wheel, drag, arrow keys, focus moves and viewport
 *      visibility stay silent.
 *   2. Greetings are single-flight. Starting one cancels whatever is already
 *      speaking, so overlap is structurally impossible (not merely unlikely).
 *
 * These tests pin the pure policy (lib/card-greet.ts, lib/arc-fan-input.ts) and
 * the wiring that applies it (SelectionBoard → ArcFan → voice.ts → gtts.ts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGreetGate, greetAllowedForEvent, type CardGreetEvent } from '../lib/card-greet';
import { fanDragIntent } from '../lib/arc-fan-input';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), 'utf8');

/** Which fan prop the nearest `onSelect={…}` / `onConfirm={…}` before `at` is. */
function handlerOwner(src: string, at: number): 'onSelect' | 'onConfirm' | null {
  const before = src.slice(0, at);
  const select = before.lastIndexOf('onSelect={');
  const confirm = before.lastIndexOf('onConfirm={');
  if (select < 0 && confirm < 0) return null;
  return confirm > select ? 'onConfirm' : 'onSelect';
}

/** A tiny stand-in for the voice layer: one speaker, cancel replaces it. */
function harness(debounceMs = 600) {
  let clock = 1_000;
  const gate = createGreetGate({ now: () => clock, debounceMs });
  let live: string[] = [];
  let greetCalls = 0;
  let cancelCalls = 0;
  const flights: number[] = [];
  const tap = (key: string): boolean => {
    const flight = gate.begin('tap', key);
    if (flight === null) return false;
    flights.push(flight);
    // playVoiceGreeting's existing cancel token, then the new greeting.
    cancelCalls += 1;
    live = [];
    greetCalls += 1;
    live.push(key);
    return true;
  };
  return {
    gate,
    tap,
    advance: (ms: number) => { clock += ms; },
    get live() { return live; },
    get greetCalls() { return greetCalls; },
    get cancelCalls() { return cancelCalls; },
    get flights() { return flights; },
  };
}

describe('(i) scrolling, focus and visibility never greet', () => {
  it('only a deliberate tap is a greeting gesture', () => {
    expect(greetAllowedForEvent('tap')).toBe(true);
    const silent: CardGreetEvent[] = ['wheel', 'drag', 'arrow', 'focus', 'visibility'];
    for (const event of silent) expect(greetAllowedForEvent(event)).toBe(false);
  });

  it('a scroll burst claims nothing — zero greeting calls', () => {
    const gate = createGreetGate({ now: () => 1_000 });
    const events: CardGreetEvent[] = [
      'wheel', 'drag', 'drag', 'wheel', 'arrow', 'focus', 'visibility', 'drag',
    ];
    const flights = events.map((event, i) => gate.begin(event, `card-${i}`));
    expect(flights).toEqual(events.map(() => null));
  });

  it('a vertical page scroll with sideways finger drift does not step the fan', () => {
    // Real phone scrolls drift; these used to cross the old 42px dx gate and
    // fire a greeting per step.
    expect(fanDragIntent(30, 400)).toBe('none');
    expect(fanDragIntent(-38, 260)).toBe('none');
    expect(fanDragIntent(41, 0)).toBe('none');
    expect(fanDragIntent(0, 500)).toBe('none');
    expect(fanDragIntent(60, 60)).toBe('none');
  });

  it('a deliberate horizontal swipe still steps the fan (selection only)', () => {
    expect(fanDragIntent(-60, 10)).toBe('next');
    expect(fanDragIntent(60, 10)).toBe('prev');
    expect(fanDragIntent(-120, 0)).toBe('next');
  });

  it('the board greets only from onConfirm — never from onSelect', () => {
    const board = read('../components/SelectionBoard.tsx');
    const owners = [...board.matchAll(/playVoiceGreeting\(/g)].map((m) =>
      handlerOwner(board, m.index ?? 0),
    );
    // Character card + language card, both tap handlers.
    expect(owners).toEqual(['onConfirm', 'onConfirm']);
  });

  it('ArcFan reaches onConfirm from the click handler only', () => {
    const fan = read('../components/ArcFan.tsx');
    const click = fan.slice(fan.indexOf('onClick={() =>'), fan.indexOf('className={`fx-press ui-card'));
    expect(click).toContain('onConfirm(item.id)');

    // Wheel, drag and keyboard all move focus through onSelect; none may speak.
    const wheel = fan.slice(fan.indexOf('const onWheel'), fan.indexOf("el.addEventListener('wheel'"));
    expect(wheel).toContain('onSelect(item.id)');
    expect(wheel).not.toContain('onConfirm');

    const go = fan.slice(fan.indexOf('const go = (next: number'), fan.indexOf('const onKeyNav'));
    expect(go).toContain('onSelect(item.id)');
    expect(go).not.toContain('onConfirm');

    // Exactly one call site, so no other path can synthesise a tap.
    expect((fan.match(/onConfirm\(/g) ?? []).length).toBe(1);

    // The drag origin advances: a swipe steps once per threshold instead of
    // re-firing the same step on every pointermove (the old burst).
    expect(fan).toContain('go(indexRef.current + (intent === \'next\' ? 1 : -1))');
  });

  it('SelectionBoard keeps selection + a11y while the voice is tap-only', () => {
    const board = read('../components/SelectionBoard.tsx');
    // Selection still applies on every navigation event…
    expect(board).toContain('onSelect={(id) => pick({ character: id })}');
    expect(board).toContain("selectedId={prefsReady ? live.character : ''}");
    // …and the selection state announced to assistive tech is untouched.
    const fan = read('../components/ArcFan.tsx');
    expect(fan).toContain('aria-pressed={active}');
    // …and the tap handler applies it too, so Enter/Space never skips prefs.
    const confirm = board.slice(board.indexOf('onConfirm={(id) =>'), board.indexOf('label={(c) => c.name}'));
    expect(confirm).toContain('pick({ character: id })');
    expect(confirm).toContain('playVoiceGreeting(');
  });
});

describe('(ii) single-flight: two rapid taps are one greeting, first cancelled', () => {
  it('a new greeting cancels the one in progress before it speaks', () => {
    const h = harness();
    expect(h.tap('kairo')).toBe(true);
    h.advance(80);
    expect(h.tap('yuki')).toBe(true);
    // Exactly one voice is live, and it is the newer one.
    expect(h.live).toEqual(['yuki']);
    expect(h.greetCalls).toBe(2);
    expect(h.cancelCalls).toBe(2);
    // The first flight is retired by the second (the cancel token).
    expect(h.gate.isCurrent(h.flights[0]!)).toBe(false);
    expect(h.gate.isCurrent(h.flights[1]!)).toBe(true);
  });

  it('a double-tap on the same card queues no second greeting', () => {
    const h = harness();
    expect(h.tap('kairo')).toBe(true);
    h.advance(120);
    expect(h.tap('kairo')).toBe(false);
    expect(h.tap('kairo')).toBe(false);
    // One greeting call total; the one already speaking is the answer.
    expect(h.greetCalls).toBe(1);
    expect(h.cancelCalls).toBe(1);
    expect(h.live).toEqual(['kairo']);
  });

  it('a deliberate later tap on the same card greets again', () => {
    const h = harness();
    expect(h.tap('kairo')).toBe(true);
    h.advance(700);
    expect(h.tap('kairo')).toBe(true);
    expect(h.greetCalls).toBe(2);
  });
});

describe('(iii) a click still greets', () => {
  it('a single tap speaks', () => {
    const h = harness();
    expect(h.tap('kairo')).toBe(true);
    expect(h.greetCalls).toBe(1);
    expect(h.live).toEqual(['kairo']);
  });

  it('the voice layer claims the gate before it stops anything', () => {
    const voice = read('../lib/voice.ts');
    const body = voice.slice(
      voice.indexOf('export function playVoiceGreeting'),
      voice.indexOf('export function previewLibraryClip'),
    );
    const claim = body.indexOf("cardGreetGate.begin('tap', key)");
    const stop = body.indexOf('stopSpeakingForCardAudition()');
    expect(claim).toBeGreaterThan(-1);
    expect(stop).toBeGreaterThan(-1);
    // A rejected same-card double-tap must not cut the greeting in progress.
    expect(claim).toBeLessThan(stop);
    expect(body).toContain("if (cardGreetGate.begin('tap', key) === null) return;");

    const preview = voice.slice(
      voice.indexOf('export function previewVoiceChoice'),
      voice.indexOf('export function previewOsVoice'),
    );
    expect(preview).toContain("cardGreetGate.begin('tap', `preview|${locale}|${choiceId}`)");
  });

  it('a retired MP3 line can never start (gtts single-flight)', () => {
    const gtts = read('../lib/gtts.ts');
    // Every play attempt asks whether this line is still the owner.
    expect(gtts).toContain('() => gen === generation,');
    // Belt and braces: a late play() that slips through is paused on onplay.
    expect(gtts).toMatch(
      /if \(gen !== generation\) \{\s*if \(currentAudio === audio\) currentAudio = null;\s*try \{ audio\.pause\(\); \}/,
    );
    // An old line settling must not clear the NEW line's cancel hook.
    expect(gtts).toContain('if (pendingReject === failLine) pendingReject = null;');
  });

  it('the shared audio starter honors the liveness probe', () => {
    const out = read('../lib/audio-output.ts');
    expect(out).toContain('stillWanted?: () => boolean');
    expect(out).toContain("if (retired()) throw new Error('canceled');");
  });
});
