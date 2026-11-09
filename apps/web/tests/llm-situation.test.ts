import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStickyOvh,
  conversationBrainKey,
  getStickyOvh,
  markRacerSent,
  oneOvhMax,
  preferOvhForCharacter,
  preferOvhModels,
  resetRacerCooldowns,
  selectRacers,
  setStickyOvh,
  FREE_RACERS,
} from '../lib/client-chat';

describe('character home OVH model', () => {
  it('is stable for a character id', () => {
    const a = preferOvhForCharacter('a01-shino');
    const b = preferOvhForCharacter('a01-shino');
    expect(a).toBe(b);
  });

  it('spreads different characters across the three models', () => {
    const ids = ['a01-shino', 'a02-shibu', 'a98-ethan', 'jun', 'mira', 'kaito', 'yuki', 'ren'];
    const homes = new Set(ids.map((id) => preferOvhForCharacter(id)));
    expect(homes.size).toBeGreaterThanOrEqual(2);
  });
});

describe('conversation sticky OVH', () => {
  beforeEach(() => {
    resetRacerCooldowns();
    clearStickyOvh();
  });

  it('starts from the character home, then sticks after setStickyOvh', () => {
    const key = conversationBrainKey('a01-shino');
    const home = preferOvhForCharacter('a01-shino');
    expect(preferOvhModels({ characterId: 'a01-shino' })[0]).toBe(home);
    expect(getStickyOvh(key)).toBeNull();

    const other = preferOvhModels({ characterId: 'a01-shino' }).find((m) => m !== home)!;
    setStickyOvh(key, other);
    expect(preferOvhModels({ characterId: 'a01-shino' })[0]).toBe(other);
    expect(getStickyOvh(key)).toBe(other);
  });

  it('keeps separate sticky brains per character conversation', () => {
    const a = conversationBrainKey('cast-a');
    const b = conversationBrainKey('cast-b');
    const homeA = preferOvhForCharacter('cast-a');
    const homeB = preferOvhForCharacter('cast-b');
    const altA = preferOvhModels({ characterId: 'cast-a' }).find((m) => m !== homeA)!;
    setStickyOvh(a, altA);
    expect(preferOvhModels({ characterId: 'cast-a' })[0]).toBe(altA);
    expect(preferOvhModels({ characterId: 'cast-b' })[0]).toBe(homeB);
    expect(getStickyOvh(b)).toBeNull();
  });
});

describe('one OVH per turn (alignment)', () => {
  beforeEach(() => resetRacerCooldowns());

  it('keeps only the preferred OVH when it is fresh', () => {
    const prefer = preferOvhModels({ characterId: 'a01-shino' });
    const capped = oneOvhMax(FREE_RACERS, prefer);
    const ovh = capped.filter((r) => r.host === 'ovhcloud');
    expect(ovh).toHaveLength(1);
    expect(ovh[0]!.model).toBe(prefer[0]);
  });

  it('failsover to the next sibling when preferred is cooling', () => {
    const prefer = preferOvhModels({ characterId: 'sticky-demo' });
    const preferred = FREE_RACERS.find((r) => r.host === 'ovhcloud' && r.model === prefer[0])!;
    const t0 = 2_000_000;
    markRacerSent(preferred.id, t0);
    markRacerSent(preferred.id, t0);
    const picked = selectRacers({ at: t0 + 1_000, preferOvh: prefer });
    const ovh = picked.filter((r) => r.host === 'ovhcloud');
    expect(ovh).toHaveLength(1);
    expect(ovh[0]!.model).toBe(prefer[1]);
  });
});
