/**
 * Pinning an OS voice, and honouring it in chat.
 *
 * A picker that cannot change what chat sounds like is the exact bug this whole
 * line of work exists to fix. So these tests cover the two halves of the promise:
 *
 *   - the pin store keeps one voice per language+gender and drops junk,
 *   - the resolver maps a stored NAME back to a live SpeechSynthesisVoice, and
 *     refuses (rather than guesses) when that voice is gone.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/voice-catalog', async () => {
  const actual = await vi.importActual<typeof import('../lib/voice-catalog')>('../lib/voice-catalog');
  return actual;
});

import {
  clearOsVoicePinsFor,
  loadOsVoicePins,
  osVoicePinFor,
  resetOsVoicePins,
  saveOsVoicePin,
} from '../lib/os-voice-picks';
import { osPinStatus, osTagFor, pinGender, resolveOsPin, resolvePinnedVoice } from '../lib/os-voice-resolve';

/** Minimal localStorage so the store's persistence path is exercised. */
interface StubStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  clear(): void;
  key(i: number): string | null;
  readonly length: number;
}

function installStorage(): void {
  const map = new Map<string, string>();
  const storage: StubStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
  (globalThis as unknown as { localStorage: StubStorage }).localStorage = storage;
}

function storage(): StubStorage {
  return (globalThis as unknown as { localStorage: StubStorage }).localStorage;
}

describe('os voice pins', () => {
  beforeEach(() => {
    installStorage();
    resetOsVoicePins();
  });

  it('starts empty', () => {
    expect(loadOsVoicePins()).toEqual({});
    expect(osVoicePinFor('yue', 'female')).toBeNull();
  });

  it('keeps a separate pin per gender, which the Google tier cannot do', () => {
    saveOsVoicePin('yue', 'female', 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', 'zh-HK');
    saveOsVoicePin('yue', 'male', 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', 'zh-HK');
    expect(osVoicePinFor('yue', 'female')?.name).toContain('Tracy');
    expect(osVoicePinFor('yue', 'male')?.name).toContain('Danny');
  });

  it('keeps pins per language independently', () => {
    saveOsVoicePin('yue', 'female', 'Tracy', 'zh-HK');
    saveOsVoicePin('ja', 'female', 'Kyoko', 'ja-JP');
    expect(osVoicePinFor('yue', 'female')?.name).toBe('Tracy');
    expect(osVoicePinFor('ja', 'female')?.name).toBe('Kyoko');
    expect(osVoicePinFor('en', 'female')).toBeNull();
  });

  it('overwrites the same slot rather than appending', () => {
    saveOsVoicePin('en', 'female', 'Zira', 'en-US');
    saveOsVoicePin('en', 'female', 'Samantha', 'en-US');
    expect(osVoicePinFor('en', 'female')?.name).toBe('Samantha');
  });

  it('an empty name clears the slot instead of storing junk', () => {
    saveOsVoicePin('en', 'female', 'Zira', 'en-US');
    saveOsVoicePin('en', 'female', '   ', 'en-US');
    expect(osVoicePinFor('en', 'female')).toBeNull();
    expect(loadOsVoicePins()).toEqual({});
  });

  it('persists across a fresh read', () => {
    saveOsVoicePin('zh', 'male', 'Kangkang', 'zh-CN');
    expect(storage().getItem('amoji.osVoice.v1')).toContain('Kangkang');
  });

  it('drops a corrupt or cross-language payload when it is read back', async () => {
    storage().setItem('amoji.osVoice.v1', JSON.stringify({
      yue: { female: { name: 'Tracy', lang: 'zh-HK' }, soprano: { name: 'Nope', lang: 'zh-HK' } },
      klingon: { female: { name: 'X', lang: 'tlh' } },
      en: { male: { name: '', lang: 'en-US' } },
    }));
    // A real reload gets a fresh module; re-importing gives us the same effect
    // without leaving a cached `loaded` latch in the way.
    vi.resetModules();
    const fresh = await import('../lib/os-voice-picks');
    expect(fresh.loadOsVoicePins()).toEqual({ yue: { female: { name: 'Tracy', lang: 'zh-HK' } } });
  });

  it('clearOsVoicePinsFor drops one language and leaves the others', () => {
    saveOsVoicePin('yue', 'female', 'Tracy', 'zh-HK');
    saveOsVoicePin('ja', 'female', 'Kyoko', 'ja-JP');
    clearOsVoicePinsFor('yue');
    expect(osVoicePinFor('yue', 'female')).toBeNull();
    expect(osVoicePinFor('ja', 'female')?.name).toBe('Kyoko');
  });

  it('ignores an unknown locale on read', () => {
    expect(osVoicePinFor('klingon', 'female')).toBeNull();
  });
});

describe('resolvePinnedVoice', () => {
  const live = [
    { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' },
    { name: 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' },
    { name: 'Microsoft Huihui - Chinese (Simplified, PRC)', lang: 'zh-CN' },
  ];

  it('finds the exact voice', () => {
    const got = resolvePinnedVoice(live, 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', 'zh-HK');
    expect(got?.name).toContain('Tracy');
  });

  it('matches case-insensitively', () => {
    expect(resolvePinnedVoice(live, 'microsoft tracy - chinese (traditional, hong kong s.a.r.)', 'zh-HK')?.lang)
      .toBe('zh-HK');
  });

  it('refuses a voice that only exists in a different locale', () => {
    // Pinning Huihui (zh-CN) while asking for zh-HK must not return it: the UI
    // would keep saying Cantonese while Mandarin played.
    expect(resolvePinnedVoice(live, 'Microsoft Huihui - Chinese (Simplified, PRC)', 'zh-HK')).toBeNull();
  });

  it('accepts a regional variant of the requested tag', () => {
    const en = [{ name: 'Samantha', lang: 'en-US' }];
    expect(resolvePinnedVoice(en, 'Samantha', 'en')?.name).toBe('Samantha');
  });

  it('returns null for a name the device no longer has', () => {
    expect(resolvePinnedVoice(live, 'Microsoft WanLung', 'zh-HK')).toBeNull();
  });

  it('returns null when the list is empty or the name is blank', () => {
    expect(resolvePinnedVoice([], 'Tracy', 'zh-HK')).toBeNull();
    expect(resolvePinnedVoice(live, '   ', 'zh-HK')).toBeNull();
  });

  it('falls back to a locale-agnostic match only when the pin carried no tag', () => {
    expect(resolvePinnedVoice(live, 'Microsoft Huihui - Chinese (Simplified, PRC)', '')?.lang).toBe('zh-CN');
  });
});

describe('resolveOsPin / osPinStatus', () => {
  const live = [{ name: 'Tracy', lang: 'zh-HK' }];

  it('resolves a live pin', () => {
    expect(resolveOsPin(live, { name: 'Tracy', lang: 'zh-HK' })?.name).toBe('Tracy');
    expect(osPinStatus(live, { name: 'Tracy', lang: 'zh-HK' })).toBe('live');
  });

  it('reports a dead pin as missing so chat can fall back', () => {
    expect(resolveOsPin(live, { name: 'WanLung', lang: 'zh-HK' })).toBeNull();
    expect(osPinStatus(live, { name: 'WanLung', lang: 'zh-HK' })).toBe('missing');
  });

  it('reports no pin as none', () => {
    expect(osPinStatus(live, null)).toBe('none');
  });
});

describe('helpers', () => {
  it('maps the app gender onto the pin slot unchanged', () => {
    expect(pinGender('female')).toBe('female');
    expect(pinGender('male')).toBe('male');
  });

  it('maps each app locale to the tag its OS voices carry', () => {
    expect(osTagFor('yue')).toBe('zh-HK');
    expect(osTagFor('zh')).toBe('zh-CN');
    expect(osTagFor('ja')).toBe('ja-JP');
    expect(osTagFor('en')).toBe('en-US');
  });
});
