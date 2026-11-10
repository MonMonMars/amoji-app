import { describe, it, expect } from 'vitest';
import { MIC_MOUTH_POS, PROPS, propsForMove, propPresence, propEnterFromTop, propMagicDust, type PropPart } from '../lib/props';
import type { MoveKind } from '../lib/moves';

const SERVED: MoveKind[] = ['sing', 'piano', 'violin', 'eat', 'dine'];

describe('stage props (r.69)', () => {
  it('every prop has parts and serves at least one move', () => {
    for (const p of PROPS) {
      expect(p.id.length, p.id).toBeGreaterThan(0);
      expect(p.parts.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.forMoves.length, p.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('geometry is sane: positive sizes, scene-space positions, hex colors', () => {
    for (const p of PROPS) {
      for (const part of p.parts) {
        const label = `${p.id}/${part.kind}`;
        for (const s of part.size) {
          if (part.kind === 'sphere' && part.size[1] === 0 && part.size[2] === 0) break;
          expect(Number.isFinite(s), label).toBe(true);
          expect(s, label).toBeGreaterThan(0);
        }
        const [x, y, z] = part.pos;
        expect(Math.abs(x), label).toBeLessThanOrEqual(1.2);
        expect(y, label).toBeGreaterThanOrEqual(0);
        expect(y, label).toBeLessThanOrEqual(1.8);
        expect(Math.abs(z), label).toBeLessThanOrEqual(1.2);
        expect(part.color, label).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('serves exactly one prop per staged move, none for unstaged moves', () => {
    for (const kind of SERVED) {
      expect(propsForMove(kind).length, kind).toBe(1);
    }
    for (const kind of ['dance', 'jump', 'kungfu', 'taichi', 'jog', 'yoga', 'stretch'] as MoveKind[]) {
      expect(propsForMove(kind).length, kind).toBe(0);
    }
    expect(propsForMove(undefined)).toEqual([]);
  });

  it('no move is served by two props at once', () => {
    const seen = new Map<MoveKind, string>();
    for (const p of PROPS) {
      for (const kind of p.forMoves) {
        expect(seen.has(kind), `${kind} claimed by both ${seen.get(kind)} and ${p.id}`).toBe(false);
        seen.set(kind, p.id);
      }
    }
  });

  it('prop presence pops in fast, melts out, full mid-performance', () => {
    expect(propPresence(0)).toBe(0);
    expect(propPresence(1)).toBe(0);
    expect(propPresence(-1)).toBe(0);
    expect(propPresence(2)).toBe(0);
    expect(propPresence(0.5)).toBe(1);
    // attack lands within the first 6% — the prop is there when she starts
    expect(propPresence(0.06)).toBe(1);
    // release: gone by the last 18% of the performance
    expect(propPresence(0.9)).toBeCloseTo(0, 5);
  });

  it('animated parts declare a hook; hooks are a closed set', () => {
    const HOOKS = new Set(['none', 'pianoKeys', 'softBob', 'sway', 'sparkle', 'magicDust']);
    let animated = 0;
    for (const p of PROPS) {
      for (const part of p.parts as PropPart[]) {
        if (part.anim) {
          animated++;
          expect(HOOKS.has(part.anim), `${p.id} ${part.anim}`).toBe(true);
        }
      }
    }
    expect(animated).toBeGreaterThanOrEqual(5); // every prop has at least one living part
  });

  it('micStand capsule sits near the mouth via MIC_MOUTH_POS', () => {
    const mic = PROPS.find((p) => p.id === 'micStand');
    expect(mic).toBeTruthy();
    const head = mic!.parts.find((p) => p.kind === 'sphere' && p.anim === 'softBob');
    expect(head).toBeTruthy();
    expect(head!.pos).toEqual(MIC_MOUTH_POS);
    expect(mic!.parts.some((p) => p.anim === 'magicDust')).toBe(true);

    const [x, y, z] = MIC_MOUTH_POS;
    // Centered on the mouth mid-line with a generous forward gap (not inside the body).
    expect(Math.abs(x)).toBeLessThanOrEqual(0.04);
    expect(y).toBeGreaterThanOrEqual(1.28);
    expect(y).toBeLessThanOrEqual(1.48);
    expect(z).toBeGreaterThanOrEqual(0.30);
    expect(z).toBeLessThanOrEqual(0.45);

    // Capsule sits well in front of the lips (toward +Z), not inside the face shell.
    const nominal: [number, number, number] = [0, 1.38, 0.06];
    expect(z - nominal[2]).toBeGreaterThanOrEqual(0.24);
    expect(head!.size[0]).toBe(0.045);
    expect(z - nominal[2]).toBeGreaterThanOrEqual(head!.size[0] * 2);
  });

  it('mic enters from above with settling dust, not from the floor', () => {
    expect(propEnterFromTop(0)).toBeGreaterThan(0.4);
    expect(propEnterFromTop(0.14)).toBe(0);
    expect(propEnterFromTop(0.5)).toBe(0);
    expect(propMagicDust(0)).toBe(1);
    expect(propMagicDust(0.22)).toBe(0);
    expect(propMagicDust(0.5)).toBe(0);
  });

});
