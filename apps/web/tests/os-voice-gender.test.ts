/**
 * The gender heuristic, checked against REAL voice names per platform.
 *
 * The whole point of this module is that speechSynthesis exposes no gender
 * field, so gender has to be read off the name. These tests hold the heuristic
 * to two standards at once:
 *
 *   1. Every voice whose gender is knowable gets it right, on Windows, Apple
 *      and Google names alike.
 *   2. Every voice whose name says NOTHING reports 'unknown'. A guess here is
 *      exactly the bug that let the old picker advertise 58 distinct voices
 *      when all of them played the same audio.
 */
import { describe, expect, it } from 'vitest';
import {
  VOICE_GENDER_CJK,
  VOICE_GENDER_EXACT,
  buildInventory,
  collapseName,
  inferVoiceGender,
  matchVoiceLocale,
  speakerKey,
} from '../lib/browser-voices';
import {
  ALL_FIXTURES,
  APPLE_VOICES,
  GOOGLE_VOICES,
  UNKNOWN_GENDER_VOICES,
  WINDOWS_VOICES,
} from './fixtures/os-voice-fixtures';

describe('gender inference: Windows SAPI/OneCore names', () => {
  it('matches the gender SAPI itself records for every voice on this machine', () => {
    const wrong: string[] = [];
    for (const v of WINDOWS_VOICES) {
      const got = inferVoiceGender(v.name, v.voiceURI ?? '');
      if (v.truth && got.gender !== v.truth) wrong.push(`${v.name}: got ${got.gender}, SAPI says ${v.truth}`);
    }
    expect(wrong).toEqual([]);
  });

  it('reads the "- Desktop" variant of a voice as the same speaker', () => {
    // Chrome lists both "Microsoft Zira - English (United States)" and
    // "Microsoft Zira Desktop - English (United States)".
    expect(inferVoiceGender('Microsoft Zira Desktop - English (United States)', '').gender).toBe('female');
    expect(inferVoiceGender('Microsoft David Desktop - English (United States)', '').gender).toBe('male');
    expect(speakerKey('Microsoft Zira Desktop - English (United States)'))
      .toBe(speakerKey('Microsoft Zira - English (United States)'));
  });

  it('knows the Cantonese pair specifically', () => {
    expect(inferVoiceGender('Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', '').gender).toBe('male');
    expect(inferVoiceGender('Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', '').gender).toBe('female');
  });
});

describe('gender inference: Apple names and bundle ids', () => {
  it('matches the known Apple voice genders', () => {
    const wrong: string[] = [];
    for (const v of APPLE_VOICES) {
      const got = inferVoiceGender(v.name, v.voiceURI ?? '');
      if (v.truth && got.gender !== v.truth) wrong.push(`${v.name}: got ${got.gender}, expected ${v.truth}`);
    }
    expect(wrong).toEqual([]);
  });

  it('reads the gender out of a Siri bundle id even when the name does not say', () => {
    // "Nicky" carries no gender, but its bundle id does.
    expect(inferVoiceGender('Nicky', 'com.apple.ttsbundle.siri_female_en-US_compact').gender).toBe('female');
    expect(inferVoiceGender('Aaron', 'com.apple.ttsbundle.siri_male_en-US_compact').gender).toBe('male');
    expect(inferVoiceGender('O-ren', 'com.apple.ttsbundle.siri_female_ja-JP_compact').gender).toBe('female');
    expect(inferVoiceGender('Hattori', 'com.apple.ttsbundle.siri_male_ja-JP_compact').gender).toBe('male');
    expect(inferVoiceGender('Aaron', 'com.apple.ttsbundle.siri_male_en-US_compact').source).toBe('apple-bundle');
  });

  it('does not read a "female" bundle id as male', () => {
    // A naive /\bmale\b/ over the raw string hits "feMALE".
    expect(inferVoiceGender('X', 'com.apple.ttsbundle.siri_female_en-US_compact').gender).toBe('female');
  });

  it('labels Sin-ji female, which is what Apple ships as the Cantonese voice', () => {
    // The "Lessons Learned" blog table lists Sin-ji as male; Apple's own
    // Cantonese voice is 善怡, a female name, and its Siri history agrees.
    const got = inferVoiceGender('Sin-ji', 'com.apple.ttsbundle.Sinji-compact');
    expect(got.gender).toBe('female');
    expect(got.source).toBe('exact-table');
  });
});

describe('gender inference: Google names', () => {
  it('matches Chromium’s own gender field for every Google voice', () => {
    const wrong: string[] = [];
    for (const v of GOOGLE_VOICES) {
      const got = inferVoiceGender(v.name, v.voiceURI ?? '');
      if (v.truth && got.gender !== v.truth) wrong.push(`${v.name}: got ${got.gender}, manifest says ${v.truth}`);
    }
    expect(wrong).toEqual([]);
  });

  it('the literal word wins over the name table', () => {
    expect(inferVoiceGender('Google UK English Male', '').gender).toBe('male');
    expect(inferVoiceGender('Google UK English Male', '').source).toBe('explicit-word');
    expect(inferVoiceGender('Google UK English Female', '').gender).toBe('female');
  });

  it('handles CJK-only names through the script table', () => {
    expect(inferVoiceGender('Google 粤語（香港）', '').gender).toBe('female');
    expect(inferVoiceGender('Google 粤語（香港）', '').source).toBe('cjk-table');
    expect(inferVoiceGender('Google 普通话（中国大陆）', '').gender).toBe('female');
    expect(inferVoiceGender('Google 國語（臺灣）', '').gender).toBe('female');
    expect(VOICE_GENDER_CJK['中文']).toBe('unknown');
  });
});

describe('gender inference: refuses to guess', () => {
  it('returns unknown when the name carries no identity at all', () => {
    for (const name of UNKNOWN_GENDER_VOICES) {
      const got = inferVoiceGender(name, '');
      expect({ name, gender: got.gender, source: got.source }).toEqual({ name, gender: 'unknown', source: 'none' });
    }
  });

  it('does not match a name token inside another word', () => {
    // "Samantha" must not be read as "Sam"; "Yating" must not be read as "Yan".
    expect(inferVoiceGender('Samantha', '').gender).toBe('female');
    expect(inferVoiceGender('Yating', '').gender).toBe('female');
    expect(inferVoiceGender('America Voice', '').gender).toBe('unknown');
  });

  it('resolves contradictory name tokens to unknown instead of picking one', () => {
    // A name carrying both a male and a female given name is not decidable.
    expect(inferVoiceGender('David Samantha', '').gender).toBe('unknown');
    expect(inferVoiceGender('Zira Ichiro', '').gender).toBe('unknown');
  });

  it('every entry in the exact table is a real gender, never "unknown"', () => {
    for (const [key, gender] of Object.entries(VOICE_GENDER_EXACT)) {
      expect({ key, gender }).not.toEqual({ key, gender: 'unknown' });
      expect(key).toBe(collapseName(key));
    }
  });
});

describe('locale filtering', () => {
  it('zh-HK is Cantonese on every platform, and Mandarin is only a substitute', () => {
    expect(matchVoiceLocale('zh-HK', 'yue')).toBe('native');
    expect(matchVoiceLocale('zh_HK', 'yue')).toBe('native');
    expect(matchVoiceLocale('yue', 'yue')).toBe('native');
    expect(matchVoiceLocale('zh-TW', 'yue')).toBe('substitute');
    expect(matchVoiceLocale('zh-CN', 'yue')).toBe('substitute');
  });

  it('a Cantonese voice is a substitute for Mandarin, not a Mandarin voice', () => {
    // The 'zh' prefix would wrongly match 'zh-hk'; this is the exact bug that
    // made Windows look like it had 8 Mandarin voices instead of 6.
    expect(matchVoiceLocale('zh-HK', 'zh')).toBe('substitute');
    expect(matchVoiceLocale('zh-CN', 'zh')).toBe('native');
    expect(matchVoiceLocale('zh-TW', 'zh')).toBe('native');
    expect(matchVoiceLocale('cmn-Hans-CN', 'zh')).toBe('native');
  });

  it('English accepts every region', () => {
    for (const tag of ['en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NG', 'en_HK']) {
      expect(matchVoiceLocale(tag, 'en')).toBe('native');
    }
    expect(matchVoiceLocale('ja-JP', 'en')).toBeNull();
  });

  it('Japanese is ja only', () => {
    expect(matchVoiceLocale('ja', 'ja')).toBe('native');
    expect(matchVoiceLocale('ja-JP', 'ja')).toBe('native');
    expect(matchVoiceLocale('zh-TW', 'ja')).toBeNull();
  });

  it('an empty or unrelated tag matches nothing', () => {
    expect(matchVoiceLocale('', 'en')).toBeNull();
    expect(matchVoiceLocale('fr-FR', 'en')).toBeNull();
  });
});

describe('deduplication and inventory counts', () => {
  it('counts a Windows device as 15 voices, not 17, when "- Desktop" duplicates appear', () => {
    const withDupes = [
      ...WINDOWS_VOICES,
      { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US', localService: true },
      { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', localService: true },
    ];
    const inv = buildInventory(withDupes, 'en', 'windows');
    expect(inv.deviceTotal).toBe(15);
    expect(inv.native.length).toBe(3);
  });

  it('keeps enhanced and compact versions of one Apple voice as separate voices', () => {
    const inv = buildInventory([
      { name: 'Samantha', lang: 'en-US', localService: true },
      { name: 'Samantha (Enhanced)', lang: 'en-US', localService: true },
    ], 'en', 'macos');
    expect(inv.deviceTotal).toBe(2);
  });

  it('gives every voice a stable, unique id', () => {
    const inv = buildInventory(WINDOWS_VOICES.map((v) => ({ ...v })), 'en', 'windows');
    const ids = inv.voices.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('os:en-us:')).toBe(true);
  });

  it('produces the same ids from a second read of the same device', () => {
    const a = buildInventory(WINDOWS_VOICES.map((v) => ({ ...v })), 'yue', 'windows');
    const b = buildInventory(WINDOWS_VOICES.map((v) => ({ ...v })), 'yue', 'windows');
    expect(a.voices.map((v) => v.id)).toEqual(b.voices.map((v) => v.id));
  });
});

describe('what a real Windows 11 device actually offers', () => {
  const raw = WINDOWS_VOICES.map((v) => ({ ...v, voiceURI: v.voiceURI ?? v.name }));

  it('zh-HK has exactly one male and one female voice', () => {
    const inv = buildInventory(raw, 'yue', 'windows');
    expect(inv.native.length).toBe(2);
    expect(inv.usable.female).toBe(1);
    expect(inv.usable.male).toBe(1);
    expect(inv.meetsThreePerGender).toBe(false);
  });

  it('Mandarin has four female and two male voices', () => {
    const inv = buildInventory(raw, 'zh', 'windows');
    expect(inv.usable.female).toBe(4);
    expect(inv.usable.male).toBe(2);
    expect(inv.meetsThreePerGender).toBe(false);
  });

  it('Japanese has three female and one male voice', () => {
    const inv = buildInventory(raw, 'ja', 'windows');
    expect(inv.usable.female).toBe(3);
    expect(inv.usable.male).toBe(1);
    expect(inv.meetsThreePerGender).toBe(false);
  });

  it('English has one female and two male voices', () => {
    const inv = buildInventory(raw, 'en', 'windows');
    expect(inv.usable.female).toBe(1);
    expect(inv.usable.male).toBe(2);
    expect(inv.meetsThreePerGender).toBe(false);
  });

  it('so NO language on a stock Windows 11 reaches 3 voices per gender', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect({ locale, meets: buildInventory(raw, locale, 'windows').meetsThreePerGender })
        .toEqual({ locale, meets: false });
    }
  });

  it('does not count a Mandarin voice as a Cantonese one', () => {
    const inv = buildInventory(raw, 'yue', 'windows');
    expect(inv.native.every((v) => v.langKey === 'zh-hk')).toBe(true);
    expect(inv.substitutes.length).toBe(6);
  });
});

describe('platform usability models', () => {
  const raw = APPLE_VOICES.map((v) => ({ ...v }));

  it('macOS lets every listed voice play', () => {
    const inv = buildInventory(raw, 'en', 'macos');
    expect(inv.selectionModel).toBe('per-voice');
    expect(inv.voices.every((v) => v.usable)).toBe(true);
  });

  it('iOS marks only one voice per language as playable', () => {
    // Safari lists Nicky/Aaron/Samantha/Fred for en-US and synthesizes one of them.
    const inv = buildInventory(raw, 'en', 'ios');
    expect(inv.selectionModel).toBe('per-language');
    const usableNative = inv.native.filter((v) => v.usable);
    const langs = new Set(usableNative.map((v) => v.langKey));
    expect(usableNative.length).toBe(langs.size);
    expect(inv.caveats).toContain('ios-one-per-language');
    expect(inv.caveats).toContain('ios-silent-switch');
  });

  it('Android marks a single device-wide voice as the reachable one', () => {
    const inv = buildInventory(GOOGLE_VOICES.map((v) => ({ ...v })), 'en', 'android');
    expect(inv.selectionModel).toBe('system-only');
    expect(inv.voices.filter((v) => v.usable).length).toBe(1);
    expect(inv.caveats).toContain('android-system-voice');
  });

  it('never claims 3-per-gender on iOS even though many voices are listed', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(buildInventory(raw, locale, 'ios').meetsThreePerGender).toBe(false);
    }
  });

  it('an empty list is supported:false, not an error', () => {
    const inv = buildInventory([], 'yue', 'windows');
    expect(inv.supported).toBe(false);
    expect(inv.voices).toEqual([]);
    expect(inv.usable).toEqual({ female: 0, male: 0, unknown: 0 });
  });

  it('counts unknown-gender voices separately instead of folding them in', () => {
    const inv = buildInventory([
      { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
      { name: 'Mystery Voice', lang: 'zh-HK', localService: true },
    ], 'yue', 'windows');
    expect(inv.usable.female).toBe(1);
    expect(inv.usable.male).toBe(0);
    expect(inv.usable.unknown).toBe(1);
    expect(inv.meetsThreePerGender).toBe(false);
  });
});

describe('fixture integrity', () => {
  it('every fixture with a known truth is classified, none is left unknown', () => {
    const missed = ALL_FIXTURES.filter((v) => v.truth && inferVoiceGender(v.name, v.voiceURI ?? '').gender === 'unknown');
    expect(missed.map((v) => v.name)).toEqual([]);
  });
});
