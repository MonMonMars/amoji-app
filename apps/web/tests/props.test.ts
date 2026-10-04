import { describe, it, expect } from 'vitest';
import { PROPS, propsForMove, propPresence, type PropPart } from '../lib/props';
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
    const HOOKS = new Set(['none', 'pianoKeys', 'softBob', 'sway', 'sparkle']);
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
});
