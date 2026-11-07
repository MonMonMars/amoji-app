/**
 * Real voice lists, one fixture per platform, captured rather than invented.
 *
 * The Windows list is the exact 15-entry list that Chrome 130, Edge and
 * bundled Chromium all reported through speechSynthesis.getVoices() on
 * Windows 11 (recorded from a headless and a headed run; both identical, and
 * the same set appears with or without voiceschanged). The genders are not
 * inferred here — they are read from
 * HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\*\Attributes\Gender,
 * which is where SAPI/OneCore itself records them.
 *
 * The Apple and Google lists come from the published voice inventories
 * (Apple's `say -v '?'` / AVSpeechSynthesisVoice dumps, and Chromium's
 * network_speech_synthesis manifest), reduced to the names that matter for zh/ja/en.
 */

export interface FixtureVoice {
  name: string;
  lang: string;
  localService: boolean;
  default?: boolean;
  voiceURI?: string;
  /** Ground truth, used to assert the heuristic rather than to feed it. */
  truth?: 'female' | 'male';
}

/** Exactly what Windows 11 exposed, with SAPI's own gender attribute. */
export const WINDOWS_VOICES: readonly FixtureVoice[] = [
  { name: 'Microsoft Hanhan - Chinese (Traditional, Taiwan)', lang: 'zh-TW', localService: true, truth: 'female' },
  { name: 'Microsoft Mark - English (United States)', lang: 'en-US', localService: true, truth: 'male' },
  { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true, truth: 'female' },
  { name: 'Microsoft Ayumi - Japanese (Japan)', lang: 'ja-JP', localService: true, truth: 'female' },
  { name: 'Microsoft Haruka - Japanese (Japan)', lang: 'ja-JP', localService: true, truth: 'female' },
  { name: 'Microsoft Ichiro - Japanese (Japan)', lang: 'ja-JP', localService: true, truth: 'male' },
  { name: 'Microsoft Sayaka - Japanese (Japan)', lang: 'ja-JP', localService: true, truth: 'female' },
  { name: 'Microsoft Huihui - Chinese (Simplified, PRC)', lang: 'zh-CN', localService: true, truth: 'female' },
  { name: 'Microsoft Kangkang - Chinese (Simplified, PRC)', lang: 'zh-CN', localService: true, truth: 'male' },
  { name: 'Microsoft Yaoyao - Chinese (Simplified, PRC)', lang: 'zh-CN', localService: true, truth: 'female' },
  { name: 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true, truth: 'male' },
  { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true, default: true, truth: 'female' },
  { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true, truth: 'male' },
  { name: 'Microsoft Yating - Chinese (Traditional, Taiwan)', lang: 'zh-TW', localService: true, truth: 'female' },
  { name: 'Microsoft Zhiwei - Chinese (Traditional, Taiwan)', lang: 'zh-TW', localService: true, truth: 'male' },
];

/**
 * macOS/iOS compact voices. `truth` is only set where the voice's own name
 * identifies a person well enough to be checked (Sin-ji is Apple's female
 * Cantonese voice; Kyoko is the female Japanese one; Hattori/Li-mu are the male
 * Siri voices). Ambiguous transliterations deliberately carry no truth.
 */
export const APPLE_VOICES: readonly FixtureVoice[] = [
  { name: 'Sin-ji', lang: 'zh-HK', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Sinji-compact', truth: 'female' },
  { name: 'Mei-Jia', lang: 'zh-TW', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Meijia-compact', truth: 'female' },
  { name: 'Ting-Ting', lang: 'zh-CN', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Tingting-compact', truth: 'female' },
  { name: 'Li-mu', lang: 'zh-CN', localService: true, voiceURI: 'com.apple.ttsbundle.siri_male_zh-CN_compact', truth: 'male' },
  { name: 'Kyoko', lang: 'ja-JP', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Kyoko-compact', truth: 'female' },
  { name: 'Hattori', lang: 'ja-JP', localService: true, voiceURI: 'com.apple.ttsbundle.siri_male_ja-JP_compact', truth: 'male' },
  { name: 'Samantha', lang: 'en-US', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Samantha-compact', truth: 'female' },
  { name: 'Aaron', lang: 'en-US', localService: true, voiceURI: 'com.apple.ttsbundle.siri_male_en-US_compact', truth: 'male' },
  { name: 'Daniel', lang: 'en-GB', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Daniel-compact', truth: 'male' },
  { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.ttsbundle.Karen-compact', truth: 'female' },
];

/**
 * Chrome desktop / Android Google TTS. Every one of these is `"gender":
 * "female"` in Chromium's network speech manifest except "Google UK English
 * Male". That is the point of the fixture: a name with no gender word at all
 * still has a known gender, and a name WITH the word contradicts nothing.
 */
export const GOOGLE_VOICES: readonly FixtureVoice[] = [
  { name: 'Google US English', lang: 'en-US', localService: false, truth: 'female' },
  { name: 'Google UK English Female', lang: 'en-GB', localService: false, truth: 'female' },
  { name: 'Google UK English Male', lang: 'en-GB', localService: false, truth: 'male' },
  { name: 'Google 日本語', lang: 'ja-JP', localService: false, truth: 'female' },
  { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, truth: 'female' },
  { name: 'Google 粤語（香港）', lang: 'zh-HK', localService: false, truth: 'female' },
  { name: 'Google 國語（臺灣）', lang: 'zh-TW', localService: false, truth: 'female' },
];

/** The names that MUST stay 'unknown': guessing these is how the old UI lied. */
export const UNKNOWN_GENDER_VOICES: readonly string[] = [
  'Google 中文',
  'Some Vendor Voice 3',
  'Voice 42',
  'Default',
];

export const ALL_FIXTURES: readonly FixtureVoice[] = [
  ...WINDOWS_VOICES,
  ...APPLE_VOICES,
  ...GOOGLE_VOICES,
];
