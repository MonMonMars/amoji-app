import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ownerCalmIdleClip, resolveChatAutoIdle } from '../lib/chat-auto-idle';
import {
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_OWNER_WANT_CODES,
  forgetCmaReactionPickCache,
  resetCmaReactionPicks,
  wantedCmaReactionCodes,
} from '../lib/cma-reaction-gallery';
import {
  forgetIdleEnabledCache,
  listEnabledIdleClipIds,
  resetIdleEnabled,
} from '../lib/idle-enabled';
import {
  IDLE_ENABLED_KEY,
  IDLE_PICK_KEY,
  IDLE_PREFS_GENERATION,
} from '../lib/idle-owner-migrate';
import {
  forgetIdlePickCache,
  idlePickFor,
  resetIdlePicks,
  saveIdlePick,
} from '../lib/idle-pick';
import { scrubAllAmojiIdleKeys } from '../lib/idle-prefs-scrub';
import {
  DEFAULT_IDLE_CLIP_ID,
  isBannedAutoIdleClip,
  isOwnerHonorableStand,
  isToxicIdleClip,
  resolveIdleClipId,
} from '../lib/idle-retired';

function mockStorage() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  };
  return store;
}

afterEach(() => {
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdleEnabledCache();
  forgetIdlePickCache();
  resetCmaReactionPicks();
  forgetCmaReactionPickCache();
});

describe('owner picks win over Quaternius (#430 vs #432)', () => {
  it('freezes idle prefs at v6 — no wipe-churn generation bump', () => {
    expect(IDLE_PREFS_GENERATION).toBe(6);
    expect(IDLE_ENABLED_KEY).toBe('amoji.idleEnabled.v6');
    expect(IDLE_PICK_KEY).toBe('amoji.idlePick.v6');
  });

  it('scrubAllAmojiIdleKeys is a no-op (never discards owner keys)', () => {
    const store = mockStorage();
    store.set('amoji.idlePick.v3', JSON.stringify({ 'a01-shino': 'IdleMixamoBreathing' }));
    store.set('amoji.idleEnabled.v5', JSON.stringify([5, 11]));
    expect(scrubAllAmojiIdleKeys()).toEqual([]);
    expect(store.has('amoji.idlePick.v3')).toBe(true);
    expect(store.has('amoji.idleEnabled.v5')).toBe(true);
  });

  it('resolveIdleClipId keeps owner RPM stands; remaps only toxic', () => {
    expect(isOwnerHonorableStand('IdleRpmFStanding001')).toBe(true);
    expect(isOwnerHonorableStand('IdleRpmMStanding001')).toBe(true);
    expect(isBannedAutoIdleClip('IdleRpmFStanding001')).toBe(true);
    expect(isToxicIdleClip('IdleRpmFStanding001')).toBe(false);
    expect(resolveIdleClipId('IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipId('IdleRpmMStanding001')).toBe('IdleRpmMStanding001');
    expect(resolveIdleClipId('IdleBreathCalm')).toBe(DEFAULT_IDLE_CLIP_ID);
    expect(resolveIdleClipId('IdleSassy')).toBe(DEFAULT_IDLE_CLIP_ID);
    expect(resolveIdleClipId('IdleRpmMVar001')).toBe(DEFAULT_IDLE_CLIP_ID);
  });

  it('migrated rail #5 enable plays IdleRpmFStanding001, not Quaternius', () => {
    const store = mockStorage();
    store.set('amoji.idleEnabled.v5', JSON.stringify([5]));
    forgetIdleEnabledCache();
    expect(listEnabledIdleClipIds()).toContain('IdleRpmFStanding001');
    expect(ownerCalmIdleClip()).toBe('IdleRpmFStanding001');
    expect(resolveChatAutoIdle({
      assistantText: '',
      openGreet: true,
      characterId: 'a01-shino',
    })).toBe('IdleRpmFStanding001');
  });

  it('per-character pin beats Quaternius default and enabled rail', () => {
    mockStorage();
    forgetIdleEnabledCache();
    forgetIdlePickCache();
    // Fresh default enable = InnersceneSam; pin overrides for that character.
    expect(listEnabledIdleClipIds()).toEqual(
      expect.arrayContaining(['IdleInnersceneSam', 'IdleRpmFStanding001']),
    );
    expect(ownerCalmIdleClip('a02-other')).toBe('IdleRpmFStanding001');
    expect(saveIdlePick('a01-shino', 'IdleRpmMStanding001')).toBe('IdleRpmMStanding001');
    expect(idlePickFor('a01-shino')).toBe('IdleRpmMStanding001');
    expect(ownerCalmIdleClip('a01-shino')).toBe('IdleRpmMStanding001');
    expect(resolveChatAutoIdle({
      assistantText: 'Hello there.',
      characterId: 'a01-shino',
    })).toBe('IdleRpmMStanding001');
  });

  it('seeds poke Want from CMA_REACTION_OWNER_WANT_CODES (= SFX_WANT_LIST)', () => {
    const store = mockStorage();
    forgetCmaReactionPickCache();
    const wanted = wantedCmaReactionCodes();
    expect(wanted.sort()).toEqual([...CMA_REACTION_OWNER_WANT_CODES].sort());
    expect(wanted).toEqual([
      'CMA00318',
      'CMA00350',
      'CMA00351',
      'CMA00354',
      'CMA00359',
      'CMA00360',
      'CMA00363',
      'CMA00364',
      'CMA00365',
      'CMA00366',
    ].sort());
    expect(store.has(CMA_REACTION_GALLERY_KEY)).toBe(true);

    const wantDoc = fs.readFileSync(
      path.join(__dirname, '../../../docs/SFX_WANT_LIST.md'),
      'utf8',
    );
    for (const code of CMA_REACTION_OWNER_WANT_CODES) {
      expect(wantDoc).toContain(code);
    }
  });

  it('CompanionCanvas prefers enabled playlist over Quaternius-only orderer', () => {
    const canvas = fs.readFileSync(
      path.join(__dirname, '../components/CompanionCanvas.tsx'),
      'utf8',
    );
    expect(canvas).toContain('enabledLoaded');
    expect(canvas).toContain('orderPassiveIdleClips');
    expect(canvas).toContain('IdleQuaterniusHuman');
  });

  it('ChatPanel quiet body loop honors ownerCalmIdleClip', () => {
    const panel = fs.readFileSync(
      path.join(__dirname, '../components/ChatPanel.tsx'),
      'utf8',
    );
    expect(panel).toContain('resolvePassiveBodyIdleClip');
    expect(panel).toContain('characterId');
    expect(panel).not.toMatch(/nextPassiveIdleClip\(\[\.\.\.PASSIVE_IDLE_LOOP_TEMPLATE\]/);
  });
});
