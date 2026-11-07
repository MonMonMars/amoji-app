'use client';
// User preferences: character, background, language — persisted locally.
// r2026-10-04.80 (Master Simon): portrait paths re-synced — the rebadged
// cast's thumbnails pointed at old source-file names (elio/robert/mikel/
// cyrus/mimi/olivia/kael) that no longer exist under /portraits, so Cloud /
// Robbie / Mika / Anchor / Ruby / Snowy / Alan showed stale or missing art.
// The pngs were renamed to character ids in r52; prefs now matches.
// r2026-10-05.102: `statusPreparing` string for the name plate's
// indeterminate "preparing…" loading state (see StatusPlate / load-progress).
import { useEffect, useState } from 'react';
import { DEFAULT_VOLUME, isVolumeStep, type VolumeStep } from './audio-levels';
import { scheduleStatePush } from './backend-client';

export type Lang = 'en' | 'yue' | 'zh' | 'ja';

export interface CharacterDef {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  /** portrait image under /portraits, or an absolute https URL (remote thumb) */
  image?: string;
  /**
   * drop-in VRM under /models — the local anime cast lives in /models/cast
   * (write `cast/<slug>.vrm`). VRM 1.0 loads through three-vrm (VRMA idle
   * clip eligible); VRM 0.x legacy rigs load through the generic avatar path
   * (auto-calibrated facing + arms, procedural idle, expression aliasing).
   * Any load failure falls back to seed-san.vrm — see ASSET_MANIFEST.md.
   *  Absolute https URLs pass through unchanged (remote community cast, r104).
   */
  model?: string;
  tagline: Record<Lang, string>;
  /** extra system-prompt personality on top of the base companion prompt */
  persona: string;
  /** wholesome enough for Kid Mode selection */
  kidSafe?: boolean;
  /** preferred neural voice per locale (edge-tts neural catalog) */
  voiceHint?: { yue: string; en: string };
}

// ---------------------------------------------------------------------------
// Cast — free-library WANT list (46). Realistic keepers A459–A468 removed from public roster.
// Original models stream from GitHub Release `free-library-want-2026-10-12`.
// Generated data: characters-want.ts (node scripts/generate-want-cast.mjs).
// Universal load fallback remains seed-san.vrm (see ASSET_MANIFEST.md).
// ---------------------------------------------------------------------------
import { CHARACTERS_WANT, WANT_CAST_RELEASE } from './characters-want';
import { isHiddenCast } from './cast-adjust';

export { WANT_CAST_RELEASE };
export const CHARACTERS: CharacterDef[] = CHARACTERS_WANT as CharacterDef[];

export type FxKind =
  | 'stars' | 'shimmer' | 'embers' | 'petals' | 'bubbles'
  | 'rain' | 'fireflies' | 'snow' | 'neon';

export interface BackgroundDef {
  id: string;
  nameKey: string;
  /** gradient fallback (offline / while the image loads) */
  css: string;
  /** ambient 3D-scene tint */
  scene: string;
  /** light rig for the 3D scene — neutral daylight outdoors, soft neutral
   * room light indoors (r2026-10-04.77) */
  setting: 'outdoor' | 'indoor';
  /** painted anime backdrop under /backgrounds */
  image?: string;
  /** animated particle layer drawn over the image */
  fx?: FxKind;
  /** bright/friendly enough for Kid Mode selection */
  kidSafe?: boolean;
}

// Painted anime scenes. Order is daytime → nighttime, left to right on the
// selection strip (A meadow noon … L milky way). Letters stay stable when
// Kid Mode hides a scene, the same way character numbers stay stable.
export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'meadow', nameKey: 'bgMeadow', css: 'linear-gradient(180deg, #7dd3fc 0%, #86efac 60%, #166534 100%)', scene: '#123a24', setting: 'outdoor',
    image: '/backgrounds/meadow.jpg', fx: 'fireflies', kidSafe: true },
  { id: 'sakura', nameKey: 'bgSakura', css: 'radial-gradient(ellipse at 50% -20%, #fb7185 0%, #581c87 55%, #1e1033 100%)', scene: '#2a0f45', setting: 'outdoor',
    image: '/backgrounds/sakura.jpg', fx: 'petals', kidSafe: true },
  { id: 'sunset', nameKey: 'bgSunset', css: 'linear-gradient(180deg, #312e81 0%, #be185d 55%, #f97316 100%)', scene: '#2a1245', setting: 'outdoor',
    image: '/backgrounds/sunset.jpg', fx: 'fireflies', kidSafe: true },
  { id: 'cloudsea', nameKey: 'bgCloudsea', css: 'radial-gradient(ellipse 680px 170px at 45% 85%, rgba(255,255,255,.6), transparent 70%), linear-gradient(180deg, #1d2b64 0%, #b83b8c 42%, #ffb26b 74%, #ffe3a3 100%)', scene: '#3b1d5c', setting: 'outdoor',
    image: '/backgrounds/cloudsea.jpg', fx: 'shimmer', kidSafe: true },
  { id: 'rain',   nameKey: 'bgRain',   css: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #020617 100%)', scene: '#0b1220', setting: 'outdoor',
    image: '/backgrounds/rain.jpg', fx: 'rain' },
  { id: 'ember',  nameKey: 'bgEmber',  css: 'radial-gradient(ellipse at 50% 130%, #7c2d12 0%, #1c0a06 65%)', scene: '#200b06', setting: 'indoor',
    image: '/backgrounds/ember.jpg', fx: 'embers' },
  { id: 'neon', nameKey: 'bgNeon', css: 'radial-gradient(circle at 18% 82%, rgba(34,211,238,.55), transparent 34%), linear-gradient(180deg, #05010f 0%, #2a1157 75%, #0b0620 100%)', scene: '#0b0620', setting: 'indoor',
    image: '/backgrounds/neon.jpg', fx: 'neon' },
  { id: 'aurora', nameKey: 'bgAurora', css: 'linear-gradient(180deg, #022c22 0%, #065f46 45%, #0f172a 100%)', scene: '#052e24', setting: 'outdoor',
    image: '/backgrounds/aurora.jpg', fx: 'shimmer', kidSafe: true },
  { id: 'snowmoon', nameKey: 'bgSnowmoon', css: 'radial-gradient(circle at 72% 20%, rgba(255,255,255,.95) 0%, transparent 19%), linear-gradient(180deg, #0a1633 0%, #274a7a 100%)', scene: '#101f3d', setting: 'outdoor',
    image: '/backgrounds/snowmoon.jpg', fx: 'snow', kidSafe: true },
  { id: 'abyss',  nameKey: 'bgAbyss',  css: 'radial-gradient(ellipse at 50% 40%, #0c4a6e 0%, #082f49 40%, #020617 100%)', scene: '#04121f', setting: 'outdoor',
    image: '/backgrounds/abyss.jpg', fx: 'bubbles' },
  { id: 'void',   nameKey: 'bgVoid',   css: 'radial-gradient(ellipse at 50% 120%, #1e1b4b 0%, #0a0a0f 60%)', scene: '#0a0a0f', setting: 'outdoor',
    image: '/backgrounds/void.jpg', fx: 'stars' },
  { id: 'galaxy', nameKey: 'bgGalaxy', css: 'radial-gradient(ellipse 150% 55% at 50% 26%, rgba(255,255,255,.13), transparent 62%), linear-gradient(180deg, #020210 0%, #161244 100%)', scene: '#0b0b26', setting: 'outdoor',
    image: '/backgrounds/galaxy.jpg', fx: 'stars', kidSafe: true },
];

export interface LangDef {
  id: Lang;
  native: string;
  /** Big script mark — the language card's face, like a character bighead. */
  glyph: string;
  /** Corner badge, the language equivalent of a character number. */
  mark: string;
  accent: string;
}

export const LANGS: LangDef[] = [
  { id: 'yue', native: '廣東話', glyph: '粵', mark: '粵', accent: '#fbbf24' },
  { id: 'zh', native: '中文', glyph: '中', mark: '中', accent: '#fb7185' },
  { id: 'ja', native: '日本語', glyph: 'あ', mark: '日', accent: '#c4b5fd' },
  { id: 'en', native: 'English', glyph: 'En', mark: 'EN', accent: '#38bdf8' },
];

export type StrKey =
  | 'chooseCharacter' | 'chooseBackground' | 'chooseLanguage' | 'chooseVoice'
  | 'voiceShowAll' | 'voiceThisLanguage' | 'previewReactions' | 'previewUniversal'
  | 'startChat' | 'back' | 'settings' | 'sayHi' | 'typing'
  | 'bgVoid' | 'bgAurora' | 'bgEmber' | 'bgSakura' | 'bgAbyss' | 'bgRain' | 'bgSunset' | 'bgMeadow'
  | 'bgCloudsea' | 'bgNeon' | 'bgSnowmoon' | 'bgGalaxy'
  // v0.9.3 flow: splash → login → select → chat
  | 'loginPrompt' | 'loginCta' | 'loginSkip'
  | 'selectTitle' | 'confirmCta' | 'openSelect'
  | 'changeCta' | 'previewCurrent' | 'previewNew'
  | 'statusIdle' | 'statusThinking' | 'statusSpeaking' | 'statusListening' | 'statusPreparing'
  | 'moodJoy' | 'moodAngry' | 'moodSad' | 'moodSurprised' | 'moodRelaxed' | 'moodNeutral'
  | 'voiceReplies' | 'neuralVoice' | 'muteAll' | 'unmuteAll' | 'muteAllHint' | 'voicePickerTitle' | 'voicePickerHint'
  | 'memoryTitle' | 'forgetBtn' | 'tutorBtn' | 'micTitle' | 'sendBtn' | 'scrollLeft' | 'scrollRight'
  // consolidated settings menu (r2026-10-02.7)
  | 'settingsCompanion' | 'settingsScene' | 'settingsVoice' | 'settingsData' | 'settingsHelp'
  | 'yourName' | 'yourGender' | 'genderMale' | 'genderFemale' | 'genderSecret'
  | 'clearHistory' | 'clearHistoryConfirm' | 'forgetConfirm'
  // memory v2 browser (r2026-10-02.11)
  | 'memoryBrowser' | 'memoryEmpty' | 'memoryAddPlaceholder' | 'memoryAdd' | 'memoryExport'
  | 'memoryCopied' | 'memoryTypePreference' | 'memoryTypeEvent' | 'memoryTypePlan' | 'forgetOneConfirm'
  // emotion diary (r2026-10-03.14)
  | 'diaryTitle' | 'diaryEmpty'
  // memory v6: annual dates + her promises (r2026-10-06.130)
  | 'datesTitle' | 'datesEmpty' | 'promisesTitle' | 'promisesEmpty'
  // kid mode (r2026-10-03.03). Retired by the ADULT ONLY decision
  // (r2026-11-08): the UI is gone, but the persisted `kidMode` data field and
  // its label string stay so old records / .aigf cards keep a readable name.
  // `kidModeHint` was deleted outright — it described a control that no longer
  // exists anywhere, which is exactly the orphan prose the string-table
  // hygiene test is there to catch.
  | 'settingsMode' | 'kidMode'
  // select top bars: chat vs story board chips
  | 'modeChat' | 'modeStory'
  // legacy-URL soft-land status lines (/mode, /setup, /story, /play)
  | 'softLandSelect' | 'softLandStory' | 'softLandChat'
  // brain routing removed with the Settings Brain section (r2026-10-06.136)
  // voice self-test + diagnostics (r2026-10-04.75)
  | 'testVoice' | 'testVoiceBtn' | 'voiceBlockedHint' | 'voiceVolume'
  | 'sfxVolume' | 'bgmVolume'
  // ChatGPT-style emotional TTS tier (r2026-10-05.112)
  | 'openaiVoice' | 'openaiVoiceHint' | 'openaiKeyPlaceholder' | 'openaiEndpointPlaceholder' | 'openaiCostHint'
  // HTTP TTS proxy for wss-blocked networks (r2026-10-06.131)
  | 'ttsProxy' | 'ttsProxyPlaceholder' | 'ttsProxyHint' | 'ttsProxySave' | 'ttsProxyClear'
  // companion card (.aigf) export/import (r2026-10-05.122)
  | 'companionFile' | 'exportCompanion' | 'importCompanion' | 'companionFileBad'
  // no-audio watchdog tap-to-replay chip (r2026-10-05.119)
  | 'replayHint'
  // 3D fallback notices (WebGL missing / model failed to load).
  // Appended at the tail on purpose: other PRs also insert into this union,
  // so keeping new blocks away from theirs avoids merge conflicts.
  | 'fallbackWebgl' | 'fallbackAsset'
  // mic not supported in this browser (was a yue/English ternary — zh/ja got English)
  | 'micUnsupported'
  // worldwide weather/news location (Settings → Your city)
  | 'settingsLocation' | 'locationHint' | 'locationCityPlaceholder' | 'locationSave'
  | 'locationClear' | 'locationSaved' | 'locationNotFound' | 'locationDetected'
  | 'locationNone' | 'locationUseDevice'
  // honest voice picker: only voices that really differ are offered, so a
  // language with one voice says so, and the engines that cannot play are
  // named once instead of being rendered as dead buttons.
  | 'voiceOnlyOneAvailable' | 'voiceEnginesUnavailable'
  | 'voiceRegionCantonese' | 'voiceRegionMandarin' | 'voiceRegionTaiwan' | 'voiceRegionJapanese'
  | 'voiceRegionUs' | 'voiceRegionUk' | 'voiceRegionAu' | 'voiceRegionIn' | 'voiceRegionNg'
  // OS-provided voices (speechSynthesis). These exist because the OS genuinely
  // ships several real voices per language on desktop — the picker must be able
  // to show them as an extra source, and must be equally able to say when the
  // device only has one.
  | 'osVoicesTitle' | 'osVoicesCount' | 'osVoicesNone' | 'osVoicesProbe'
  | 'osVoicesGenderUnknown' | 'osVoicesInferred' | 'osVoicesNetwork'
  | 'osVoicesDiagTitle' | 'osVoicesDiagHint' | 'osVoicesDiagEmpty'
  | 'osVoicesCaveatIosSilent' | 'osVoicesCaveatIosOnePerLang'
  | 'osVoicesCaveatAndroidSystem' | 'osVoicesCaveatMacDownload'
  | 'osVoicesUnreachable' | 'osVoicesSubstitute'
  // OPTIONAL "sharper brain" (BYOK) — a collapsed Advanced section only.
  // Deliberately NOT called "setup": the app is complete without a key, and
  // roughly 40–92% of users abandon a product at the API-key step, so the copy
  // has to read as an extra, not a missing piece.
  | 'brainAdvanced' | 'brainAdvancedHint' | 'brainOptional' | 'brainWorksWithout'
  | 'brainHide' | 'brainProvider' | 'brainAuto'
  | 'brainKeyLabel' | 'brainKeyPlaceholder' | 'brainKeyStored' | 'brainGetKey'
  | 'brainTest' | 'brainTesting'
  | 'brainTestOk' | 'brainTestNokey' | 'brainTestAuth' | 'brainTestBlocked'
  | 'brainTestModel' | 'brainTestCredit' | 'brainTestOffline' | 'brainTestTimeout'
  | 'brainPrivacy' | 'brainClearKey'
  // 18+ entry gate (r2026-11-08). Amoji is an adults-only product, and it is a
  // voice companion — so the first screen has to get an explicit "I am 18+"
  // and an honest answer to "could you hear her?" before select. Appended at
  // the tail: several PRs collide at the end of this union, and moving the
  // existing blocks would turn every collision into a conflict there.
  | 'gateStep' | 'gate18Title' | 'gate18Body' | 'gate18Ack' | 'gate18Cta'
  | 'gateAudioTitle' | 'gateAudioBody' | 'gateAudioIosHint' | 'gateAudioTest'
  | 'gateAudioPlaying' | 'gateAudioQuestion' | 'gateAudioYes' | 'gateAudioNo'
  | 'gateHelpTitle' | 'gateHelpSwitch' | 'gateHelpVolume' | 'gateHelpBluetooth'
  | 'gateHelpTabMuted' | 'gateHelpRetry' | 'gateHelpContinue' | 'gateHelpNote'
  | 'gateMicTitle' | 'gateMicBody' | 'gateMicAllow' | 'gateMicSkip'
  | 'gateMicGranted' | 'gateMicDenied' | 'gateMicUnsupported' | 'gateEnter'
  // adult-only replacement for the old Kid Mode row in Settings
  | 'settingsAdultOnly';

export const STRINGS: Record<StrKey, Record<Lang, string>> = {
  chooseCharacter: { en: 'Choose your companion', yue: '揀你嘅小伙伴', zh: '选择你的伙伴', ja: '相棒を選ぶ' },
  chooseBackground: { en: 'Choose a scene', yue: '揀個場景', zh: '选择场景', ja: '場所を選ぶ' },
  chooseLanguage: { en: 'Choose a language', yue: '揀語言', zh: '选择语言', ja: '言語を選ぶ' },
  chooseVoice: { en: 'Voice', yue: '聲線', zh: '声音', ja: '声' },
  voiceShowAll: { en: 'All', yue: '全部', zh: '全部', ja: '全部' },
  voiceThisLanguage: { en: 'This language', yue: '呢種語言', zh: '这个语言', ja: 'この言語' },
  // Says why a language has only a button or two, instead of leaving the user
  // to wonder where the rest went.
  voiceOnlyOneAvailable: {
    en: 'This language has one available voice right now.',
    yue: '呢種語言而家得一把聲可以用。',
    zh: '这个语言目前只有一把声音可用。',
    ja: 'この言語で使える声は今ひとつだけです。',
  },
  // One line for every engine that cannot play, so the short list is explained.
  voiceEnginesUnavailable: {
    en: 'Other engines are not available here: the Microsoft neural endpoint refuses this app, and the offline models are not bundled.',
    yue: '其他引擎喺度用唔到：微軟神經語音端點拒絕咗本程式，離線模型亦冇包埋。',
    zh: '其他引擎在此不可用：微软神经语音端点拒绝了本应用，离线模型也未打包。',
    ja: 'ほかのエンジンはここでは使えません。Microsoft のニューラル音声はこのアプリを拒否し、オフラインのモデルは同梱されていません。',
  },
  // Voice labels are the region of the speaker behind each Google `tl` code.
  voiceRegionCantonese: { en: 'Cantonese', yue: '廣東話', zh: '粤语', ja: '広東語' },
  voiceRegionMandarin: { en: 'Mandarin', yue: '國語', zh: '普通话', ja: '普通話' },
  voiceRegionTaiwan: { en: 'Taiwan Mandarin', yue: '台灣國語', zh: '台湾国语', ja: '台湾華語' },
  voiceRegionJapanese: { en: 'Japanese', yue: '日文', zh: '日语', ja: '日本語' },
  voiceRegionUs: { en: 'US English', yue: '美國英文', zh: '美式英语', ja: 'アメリカ英語' },
  voiceRegionUk: { en: 'UK English', yue: '英國英文', zh: '英式英语', ja: 'イギリス英語' },
  voiceRegionAu: { en: 'Australian English', yue: '澳洲英文', zh: '澳洲英语', ja: 'オーストラリア英語' },
  voiceRegionIn: { en: 'Indian English', yue: '印度英文', zh: '印度英语', ja: 'インド英語' },
  voiceRegionNg: { en: 'Nigerian English', yue: '尼日利亞英文', zh: '尼日利亚英语', ja: 'ナイジェリア英語' },
  // ---- OS-provided voices (speechSynthesis) -------------------------------
  // The OS genuinely ships several real voices per language on desktop, so the
  // picker can offer them as an extra source; it must also be able to say when
  // this device only has one.
  osVoicesTitle: { en: 'Voices built into this device', yue: '呢部機本身有嘅聲線', zh: '本机自带的声音', ja: 'この端末に入っている声' },
  osVoicesCount: {
    en: '{n} device voices · {female} female, {male} male',
    yue: '{n} 把機內聲線 · 女 {female} · 男 {male}',
    zh: '{n} 个机内声音 · 女 {female} · 男 {male}',
    ja: '端末内の声 {n} 個 · 女性 {female} · 男性 {male}',
  },
  osVoicesNone: {
    en: 'This browser exposed no speech voices for this language.',
    yue: '呢個瀏覽器冇提供任何呢種語言嘅聲線。',
    zh: '这个浏览器没有提供任何该语言的声音。',
    ja: 'このブラウザはこの言語の声をひとつも公開していません。',
  },
  osVoicesProbe: { en: 'Check this device’s voices', yue: '檢查呢部機有咩聲線', zh: '检查本机有哪些声音', ja: 'この端末の声を調べる' },
  osVoicesGenderUnknown: { en: 'gender unknown', yue: '性別未知', zh: '性别未知', ja: '性別不明' },
  osVoicesInferred: {
    en: 'Gender is read from the voice name — the browser API has no gender field. A name it does not recognise shows as unknown rather than being guessed.',
    yue: '性別係由聲線名估出嚟——瀏覽器 API 冇性別欄位。認唔到嘅名會顯示「未知」，唔會亂估。',
    zh: '性别是从声音名称推断的——浏览器 API 没有性别字段。认不出的名称会显示「未知」，不会乱猜。',
    ja: '性別は声の名前から推定しています。ブラウザ API に性別の項目はないため、判別できない名前は推測せず「不明」と表示します。',
  },
  osVoicesNetwork: { en: 'network', yue: '要上網', zh: '需要联网', ja: 'ネットワーク' },
  osVoicesDiagTitle: { en: 'Which voices this device really has', yue: '呢部機實際有邊啲聲線', zh: '本机实际有哪些声音', ja: 'この端末にある声の一覧' },
  osVoicesDiagHint: {
    en: 'This is the raw list the browser reports. If a language shows one voice here, that is why you only hear one — no setting in the app can add another.',
    yue: '呢個係瀏覽器報返嚟嘅原始清單。如果某種語言得一把聲，就係你只聽到一把聲嘅原因——App 入面點設定都變唔出第二把。',
    zh: '这是浏览器报告的原始清单。若某语言只有一把声音，这就是你只听到一把的原因——应用里任何设置都变不出第二把。',
    ja: 'ブラウザが報告している生の一覧です。ある言語の声がひとつだけなら、それが「ひとつしか聞こえない」理由です。アプリ側の設定では増やせません。',
  },
  osVoicesDiagEmpty: { en: 'No voices reported by this browser.', yue: '呢個瀏覽器冇報告任何聲線。', zh: '这个浏览器没有报告任何声音。', ja: 'このブラウザは声を報告していません。' },
  osVoicesCaveatIosSilent: {
    en: 'On iPhone and iPad the hardware silent switch mutes all browser speech, and no page can detect it. If voices are listed but you hear nothing, check that switch first.',
    yue: 'iPhone 同 iPad 嘅硬件靜音開關會靜音所有網頁語音，而且任何網頁都偵測唔到。聲線明明有但你聽唔到，先檢查嗰個掣。',
    zh: 'iPhone 和 iPad 的硬件静音开关会让所有网页语音静音，而且任何网页都检测不到。声音明明存在却听不见，请先检查该开关。',
    ja: 'iPhone / iPad の本体横のサイレントスイッチは、ブラウザの音声をすべて消音します。ページ側からは検知できません。声はあるのに聞こえないときは、まずこのスイッチを確認してください。',
  },
  osVoicesCaveatIosOnePerLang: {
    en: 'iOS lists many voices but speaks only one per language — asking for another name in the same language silently plays the default instead.',
    yue: 'iOS 會列出好多聲線，但每種語言實際只會出一把——叫同語言另一個名，會靜靜雞變返預設嗰把。',
    zh: 'iOS 会列出很多声音，但每种语言实际只播一把——请求同语言的另一个名称，会静默改回默认那把。',
    ja: 'iOS は多くの声を一覧に出しますが、実際に鳴るのは言語ごとにひとつだけです。同じ言語の別名を指定しても、既定の声に黙って置き換わります。',
  },
  osVoicesCaveatAndroidSystem: {
    en: 'Android plays whichever voice is set in the system Text-to-speech settings. The page can pick the language, not the voice.',
    yue: 'Android 會用系統「文字轉語音」設定揀好嗰把聲。網頁只可以揀語言，揀唔到聲線。',
    zh: 'Android 会播放系统「文字转语音」设置里选定的声音。网页只能选择语言，不能选择声音。',
    ja: 'Android は端末の「テキスト読み上げ」設定で選ばれている声を再生します。ページ側で選べるのは言語だけで、声そのものは選べません。',
  },
  osVoicesCaveatMacDownload: {
    en: 'macOS installs one compact voice per language by default. Extra enhanced or premium voices must be downloaded in System Settings → Accessibility → Spoken Content.',
    yue: 'macOS 每種語言預設只裝一把精簡聲線。其他增強／高級聲線要去「系統設定 → 輔助使用 → 朗讀內容」自己下載。',
    zh: 'macOS 每种语言默认只装一个精简声音。其他增强／高级声音需在「系统设置 → 辅助功能 → 朗读内容」中自行下载。',
    ja: 'macOS は言語ごとにコンパクトな声をひとつだけ標準で入れています。追加の拡張／プレミアム音声は「システム設定 → アクセシビリティ → 読み上げコンテンツ」からダウンロードが必要です。',
  },
  osVoicesUnreachable: { en: 'listed, but will not play', yue: '列出但唔會出聲', zh: '已列出但不会播放', ja: '一覧にあるが再生されない' },
  osVoicesSubstitute: {
    en: 'other language — mispronounces this one',
    yue: '第二種語言——讀呢種語言會讀錯',
    zh: '其他语言——朗读本语言会读错',
    ja: '別の言語 — この言語を正しく発音しません',
  },
  previewReactions: { en: 'Reactions', yue: '反應聲', zh: '反应声', ja: 'リアクション' },
  previewUniversal: { en: 'Universal', yue: '通用', zh: '通用', ja: '共通' },
  startChat: { en: 'Start chatting', yue: '開始傾偈', zh: '开始聊天', ja: '話し始める' },
  back: { en: 'Back', yue: '返回', zh: '返回', ja: '戻る' },
  settings: { en: 'Settings', yue: '設定', zh: '设置', ja: '設定' },
  sayHi: { en: 'Say hi to {name} 👋', yue: '同 {name} 打個招呼 👋', zh: '跟 {name} 打个招呼 👋', ja: '{name}に挨拶してね 👋' },
  typing: { en: '{name} is typing…', yue: '{name} 緊打緊字…', zh: '{name} 正在输入…', ja: '{name}が入力中…' },
  bgVoid: { en: 'Night Void', yue: '夜空', zh: '夜空', ja: '夜空' },
  bgAurora: { en: 'Aurora', yue: '極光', zh: '极光', ja: 'オーロラ' },
  bgEmber: { en: 'Ember', yue: '餘燼', zh: '余烬', ja: '余燼' },
  bgSakura: { en: 'Sakura', yue: '櫻花', zh: '樱花', ja: '桜' },
  bgAbyss: { en: 'Abyss', yue: '深海', zh: '深海', ja: '深海' },
  bgRain: { en: 'Rainy Night', yue: '雨夜', zh: '雨夜', ja: '雨の夜' },
  bgSunset: { en: 'Sunset', yue: '夕陽', zh: '夕阳', ja: '夕日' },
  bgMeadow: { en: 'Meadow', yue: '草原', zh: '草原', ja: '草原' },
  bgCloudsea: { en: 'Cloud-Sea Sunset', yue: '夕燒雲海', zh: '夕烧云海', ja: '夕焼け雲海' },
  bgNeon: { en: 'Neon City', yue: '霓虹都市', zh: '霓虹都市', ja: 'ネオン都市' },
  bgSnowmoon: { en: 'Snow Moon', yue: '雪月', zh: '雪月夜', ja: '雪の月夜' },
  bgGalaxy: { en: 'Milky Way', yue: '銀河', zh: '银河', ja: '天の川' },
  loginPrompt: { en: 'What should I call you?', yue: '點稱呼你呀？', zh: '该怎么称呼你？', ja: 'なんて呼べばいい？' },
  loginCta: { en: 'Continue →', yue: '開始 →', zh: '开始 →', ja: '始める →' },
  loginSkip: { en: 'skip', yue: '略過', zh: '跳过', ja: 'スキップ' },
  selectTitle: { en: 'Build your companion', yue: '打造你嘅小伙伴', zh: '打造你的伙伴', ja: '相棒をつくる' },
  confirmCta: { en: 'START', yue: 'START', zh: 'START', ja: 'START' },
  changeCta: { en: 'Change', yue: '更改', zh: '更改', ja: '変更' },
  previewCurrent: { en: 'current companion', yue: '而家嘅小伙伴', zh: '当前的伙伴', ja: 'いまの相棒' },
  previewNew: { en: 'new choice — tap Change to apply', yue: '新選擇——撳「更改」先會生效', zh: '新选择——点「更改」后生效', ja: '新しい選択——「変更」で適用' },
  openSelect: { en: 'Tap to change character / scene / language', yue: '撳呢度轉角色 / 場景 / 語言', zh: '点击更换角色 / 场景 / 语言', ja: 'タップで相棒・場所・言語を変更' },
  statusIdle: { en: 'idle', yue: '待命', zh: '待命', ja: '待機中' },
  statusThinking: { en: 'thinking…', yue: '諗緊…', zh: '正在想…', ja: '考え中…' },
  statusSpeaking: { en: 'speaking…', yue: '講緊…', zh: '正在说…', ja: '話してる…' },
  statusListening: { en: 'listening…', yue: '聽緊…', zh: '正在听…', ja: '聞いてる…' },
  statusPreparing: { en: 'preparing…', yue: '準備緊…', zh: '准备中…', ja: '準備中…' },
  moodJoy: { en: 'happy', yue: '開心', zh: '开心', ja: '嬉しい' },
  moodAngry: { en: 'annoyed', yue: '嬲嬲哋', zh: '有点小情绪', ja: '拗ねてる' },
  moodSad: { en: 'down', yue: '唔開心', zh: '有点低落', ja: '落ち込み' },
  moodSurprised: { en: 'surprised', yue: '好驚訝', zh: '惊讶', ja: 'びっくり' },
  moodRelaxed: { en: 'relaxed', yue: '好放鬆', zh: '很放松', ja: 'リラックス' },
  moodNeutral: { en: 'calm', yue: '平靜', zh: '平静', ja: '穏やか' },
  voiceReplies: { en: 'Voice replies', yue: '語音回覆', zh: '语音回复', ja: '音声返答' },

  muteAll: { en: 'Mute all', yue: '全部靜音', zh: '全部静音', ja: 'すべてミュート' },
  unmuteAll: { en: 'Unmute all', yue: '取消全部靜音', zh: '取消全部静音', ja: 'すべて解除' },
  muteAllHint: {
    en: 'Turn off all sound, voice, and effects. Mic stays separate.',
    yue: '關閉全部聲音、語音同音效。咪高峰唔受影響。',
    zh: '关闭全部声音、语音和音效。麦克风不受影响。',
    ja: '音声・ボイス・効果音をすべてオフ。マイクは別です。',
  },

  neuralVoice: { en: 'Neural voice (online)', yue: '神經語音（在線）', zh: '神经语音（在线）', ja: 'ニューラル音声（オンライン）' },
  voicePickerTitle: { en: 'Available voices', yue: '可用嘅聲線', zh: '可用的声音', ja: '使える声' },
  voicePickerHint: {
    en: 'Tap a voice to hear it and keep it. Each language lists only the voices that actually sound different on this device.',
    yue: '撳一把聲嚟試聽同記住。每種語言只會列出真係聽得出分別嘅聲。',
    zh: '点一个声音试听并记住。每种语言只列出真的听得出分别的声音。',
    ja: '声をタップして試聴し、その声を保存します。言語ごとに、実際に違って聞こえる声だけを並べています。',
  },
  memoryTitle: { en: 'Memory', yue: '記憶', zh: '记忆', ja: '記憶' },
  forgetBtn: { en: 'Forget everything', yue: '全部忘記', zh: '全部忘记', ja: 'すべて忘れる' },
  tutorBtn: { en: 'How to use', yue: '使用教學', zh: '使用教学', ja: '使い方' },
  micTitle: { en: 'Tap the orb to talk', yue: '撳個波講嘢', zh: '点彩球说话', ja: 'オーブをタップして話す' },
  sendBtn: { en: 'Send', yue: '傳送', zh: '发送', ja: '送信' },
  scrollLeft: { en: 'Scroll left', yue: '向左滑', zh: '向左滚动', ja: '左にスクロール' },
  scrollRight: { en: 'Scroll right', yue: '向右滑', zh: '向右滚动', ja: '右にスクロール' },
  settingsCompanion: { en: 'Companion', yue: '小伙伴', zh: '伙伴', ja: '相棒' },
  settingsScene: { en: 'Scene', yue: '場景', zh: '场景', ja: '場所' },
  settingsVoice: { en: 'Voice', yue: '聲音', zh: '声音', ja: '音声' },
  settingsData: { en: 'Memory & data', yue: '記憶同資料', zh: '记忆与数据', ja: '記憶とデータ' },
  settingsHelp: { en: 'Help', yue: '幫助', zh: '帮助', ja: 'ヘルプ' },
  yourName: { en: 'Your name', yue: '你嘅名字', zh: '你的名字', ja: 'あなたの名前' },
  yourGender: { en: 'You are', yue: '你係', zh: '你是', ja: 'あなたは' },
  genderMale: { en: 'Male', yue: '男仔', zh: '男生', ja: '男性' },
  genderFemale: { en: 'Female', yue: '女仔', zh: '女生', ja: '女性' },
  genderSecret: { en: 'Rather not say', yue: '保密', zh: '保密', ja: '内緒' },
  clearHistory: { en: 'Clear chat history', yue: '清空傾偈紀錄', zh: '清空聊天记录', ja: '会話履歴を消去' },
  // r2026-10-05.122 — the Companion Card (.aigf)
  companionFile: { en: 'Companion file', yue: '伴侶檔案', zh: '伴侣档案', ja: 'コンパニオンカード' },
  exportCompanion: { en: 'Save her to file ⬇', yue: '儲存佢落檔案 ⬇', zh: '保存到文件 ⬇', ja: 'ファイルに保存 ⬇' },
  importCompanion: { en: 'Load from file ⬆', yue: '由檔案載入 ⬆', zh: '从文件载入 ⬆', ja: 'ファイルから読む ⬆' },
  companionFileBad: { en: 'That file is not a companion card ({reason})', yue: '呢個檔案唔係伴侶檔案（{reason}）', zh: '这个文件不是伴侣档案（{reason}）', ja: 'それはコンパニオンカードではありません（{reason}）' },
  // r119 — no-audio watchdog: her last line went unheard; ANY tap replays it
  replayHint: { en: 'Her line went silent — tap anywhere to replay', yue: '佢把聲出唔到嚟——撳任何地方重播', zh: '她的声音没放出来——点任意处重播', ja: '声が出ませんでした — どこかをタップして再生' },
  clearHistoryConfirm: { en: 'Clear the whole conversation history?', yue: '真係要清空晒成個傾偈紀錄？', zh: '确定要清空全部聊天记录吗？', ja: '会話履歴をすべて消去しますか？' },
  forgetConfirm: { en: 'Forget everything she remembers about you?', yue: '要佢忘記晒所有關於你嘅記憶？', zh: '要TA忘记所有关于你的记忆吗？', ja: 'あなたのことをすべて忘れさせますか？' },
  memoryBrowser: { en: 'What she remembers', yue: '佢記住咗嘅嘢', zh: '她记住的事', ja: '覚えていること' },
  memoryEmpty: {
    en: 'Nothing yet — she learns as you two chat.',
    yue: '仲未有——傾偈傾得多，佢就會記住。',
    zh: '还没有——聊得越多，她记得越多。',
    ja: 'まだない——話すほど覚えるよ。',
  },
  memoryAddPlaceholder: { en: 'Teach her something to remember…', yue: '話樣嘢俾佢記住…', zh: '告诉她要记住的事…', ja: '覚えてほしいことを教えて…' },
  memoryAdd: { en: 'Add', yue: '加入', zh: '添加', ja: '追加' },
  memoryExport: { en: 'Copy all', yue: '複製全部', zh: '复制全部', ja: 'すべてコピー' },
  memoryCopied: { en: 'Copied ✓', yue: '複製咗 ✓', zh: '已复制 ✓', ja: 'コピー ✓' },
  memoryTypePreference: { en: 'likes', yue: '鍾意', zh: '喜欢', ja: '好き' },
  memoryTypeEvent: { en: 'moment', yue: '往事', zh: '经历', ja: '思い出' },
  memoryTypePlan: { en: 'plan', yue: '計劃', zh: '计划', ja: '予定' },
  forgetOneConfirm: { en: 'Forget just this memory?', yue: '淨係唔記得呢樣嘢？', zh: '只忘记这一条吗？', ja: 'これだけ忘れる？' },
  diaryTitle: {
    en: '📖 Her diary — how she remembers your recent days',
    yue: '📖 佢嘅日記——佢點樣記住你哋最近嘅日子',
    zh: '📖 她的日记——她如何记住你们最近的日子',
    ja: '📖 彼女の日記——最近の日々をどう覚えているか',
  },
  diaryEmpty: {
    en: 'No entries yet — she writes a line after every chat.',
    yue: '仲未有——每次傾偈之後，佢會寫低一筆。',
    zh: '还没有——每次聊天后，她都会记下一笔。',
    ja: 'まだない——会話のたびに一行書き留めるよ。',
  },
  // memory v6 (r2026-10-06.130) — annual dates + her promises
  datesTitle: {
    en: '🎂 Dates she celebrates every year',
    yue: '🎂 佢每年都慶祝嘅日子',
    zh: '🎂 她每年都庆祝的日子',
    ja: '🎂 毎年祝ってくれる日',
  },
  datesEmpty: {
    en: 'None yet — tell her when your birthday is.',
    yue: '仲未有——話俾佢知你生日幾時吖。',
    zh: '还没有——告诉她你的生日是什么时候吧。',
    ja: 'まだない——誕生日を教えてね。',
  },
  promisesTitle: {
    en: '🤝 Things she promised you',
    yue: '🤝 佢應承過你嘅嘢',
    zh: '🤝 她答应过你的事',
    ja: '🤝 あなたとの約束',
  },
  promisesEmpty: {
    en: 'None yet — she remembers every promise she makes.',
    yue: '仲未有——佢應承咗嘅嘢，佢會記住。',
    zh: '还没有——她答应过的事都会记住。',
    ja: 'まだない——約束したことはちゃんと覚えてるよ。',
  },
  settingsMode: { en: 'Mode', yue: '模式', zh: '模式', ja: 'モード' },
  modeChat: { en: 'Chat', yue: '傾偈', zh: '聊天', ja: 'チャット' },
  modeStory: { en: 'Story', yue: '故事', zh: '故事', ja: 'ストーリー' },
  softLandSelect: {
    en: 'Taking you to character select...',
    yue: '帶緊你去揀角色…',
    zh: '正在带你去选择角色…',
    ja: 'キャラクター選択へ移動中…',
  },
  softLandStory: {
    en: 'Opening story select...',
    yue: '打開緊故事選擇…',
    zh: '正在打开故事选择…',
    ja: 'ストーリー選択を開いています…',
  },
  softLandChat: {
    en: 'Taking you to chat...',
    yue: '帶緊你去傾偈…',
    zh: '正在带你去聊天…',
    ja: 'チャットへ移動中…',
  },
  // Retired from the UI by the ADULT ONLY decision (r2026-11-08); kept with the
  // data field so an old record or imported card still resolves to a name.
  kidMode: { en: 'Kid mode', yue: '兒童模式', zh: '儿童模式', ja: 'キッズモード' },
  testVoice: { en: 'Test voice', yue: '試吓把聲', zh: '试试声音', ja: '声テスト' },
  voiceVolume: { en: 'Dialogue volume', yue: '對白音量', zh: '对白音量', ja: 'セリフ音量' },
  sfxVolume: { en: 'Sound effects', yue: '音效', zh: '音效', ja: '効果音' },
  bgmVolume: { en: 'Background music', yue: '背景音樂', zh: '背景音乐', ja: 'BGM' },
  testVoiceBtn: { en: '▶ Play', yue: '▶ 播一次', zh: '▶ 播放', ja: '▶ 再生' },
  voiceBlockedHint: {
    en: "No sound was heard — check the phone's silent switch and volume, then press Play again. If it's still silent, turn Voice replies off and on once.",
    yue: '聽唔到聲——檢查電話嘅靜音掣同音量，再撳一次播放。仲係唔得嘅話，將「語音回覆」關掉再開一次。',
    zh: '没有听到声音——请检查手机的静音开关和音量，然后再按一次播放。如果还是无声，把「语音回复」关掉再打开一次。',
    ja: '声が聞こえません——本体のミュートスイッチと音量を確認してから、もう一度再生を押してください。それでもだめなら「音声返答」を一度オフにしてオンに戻してください。',
  },
  // ChatGPT-style emotional TTS tier (r2026-10-05.112)
  openaiVoice: {
    en: 'ChatGPT voice (OpenAI)', yue: 'ChatGPT 聲（OpenAI）', zh: 'ChatGPT 声音（OpenAI）', ja: 'ChatGPT音声（OpenAI）',
  },
  openaiVoiceHint: {
    en: 'Emotional, human-sounding voice — the same engine family as ChatGPT. Needs your OpenAI API key plus a proxy URL; without a proxy the browser blocks the call and the free voices are used instead.',
    yue: '有感情、似真人嘅聲——同 ChatGPT 同一引擎家族。要用你嘅 OpenAI API key 加 proxy 網址；冇 proxy 嘅話瀏覽器會擋，會用返免費聲。',
    zh: '有感情、像真人的声音——与 ChatGPT 同一引擎家族。需要你的 OpenAI API 密钥加代理网址；没有代理时浏览器会拦截，自动改用免费声音。',
    ja: '感情的で人間らしい音声——ChatGPTと同じエンジン系。OpenAI APIキーとプロキシURLが必要。プロキシがないとブラウザがブロックし、無料音声に切り替わります。',
  },
  openaiKeyPlaceholder: {
    en: 'sk-… OpenAI API key — saved only on this device',
    yue: 'sk-… OpenAI API 密鑰——只喺呢部機保存',
    zh: 'sk-… OpenAI API 密钥——仅保存在本设备',
    ja: 'sk-… OpenAI APIキー——この端末のみ保存',
  },
  openaiEndpointPlaceholder: {
    en: 'proxy URL (blank = api.openai.com, blocked by the browser)',
    yue: 'proxy 網址（留空＝api.openai.com，瀏覽器會擋）',
    zh: '代理网址（留空＝api.openai.com，会被浏览器拦截）',
    ja: 'プロキシURL（空＝api.openai.com、ブラウザにブロックされます）',
  },
  openaiCostHint: {
    en: 'Uses gpt-4o-mini-tts ≈ US$0.015/min — a month of daily chats ≈ US$1.',
    yue: '用 gpt-4o-mini-tts ≈ US$0.015/分鐘——每日傾偈一個月 ≈ US$1。',
    zh: '使用 gpt-4o-mini-tts ≈ US$0.015/分钟——每天聊天一个月 ≈ US$1。',
    ja: 'gpt-4o-mini-tts使用 ≈ 0.015米ドル/分——毎日話すと1か月 ≈ 1米ドル。',
  },
  // HTTP TTS proxy for wss-blocked networks (r2026-10-06.131)
  ttsProxy: {
    en: 'Neural voice proxy (optional)', yue: '神經語音 proxy（可選）', zh: '神经语音代理（可选）', ja: 'ニューラル音声プロキシ（任意）',
  },
  ttsProxyPlaceholder: {
    en: 'https://your-worker.workers.dev/ — blank = direct connection',
    yue: 'https://your-worker.workers.dev/ — 留空＝直接連線',
    zh: 'https://your-worker.workers.dev/ — 留空＝直接连接',
    ja: 'https://your-worker.workers.dev/ — 空欄＝直接接続',
  },
  ttsProxyHint: {
    en: 'Only if her voice stays silent on your network: a free Cloudflare Worker carries the voice over https when the phone network blocks the live socket. Code + deploy steps: server/amoji-proxy in the GitHub repo.',
    yue: '只喺把聲喺你個網絡一直靜音先需要用：免費 Cloudflare Worker 用 https 傳送把聲，等電話網絡擋唔到。代碼同部署步驟喺 GitHub repo 嘅 server/amoji-proxy。',
    zh: '仅当声音在你的网络上一直无声时才需要：免费 Cloudflare Worker 用 https 传输语音，手机网络就挡不住了。代码与部署步骤在 GitHub 仓库的 server/amoji-proxy。',
    ja: '音声が自分の回線で鳴らない場合のみ必要：無料のCloudflare Workerが音声をhttpsで運ぶので、モバイル回線のブロックを回避できます。コードと手順はGitHubリポジトリのserver/amoji-proxyにあります。',
  },
  ttsProxySave: {
    en: 'Save', yue: '儲存', zh: '保存', ja: '保存',
  },
  ttsProxyClear: {
    en: 'Clear', yue: '清除', zh: '清除', ja: 'クリア',
  },
  fallbackWebgl: {
    en: 'WebGL is unavailable in this browser — showing the calm view. Chat still works.',
    yue: '你嘅瀏覽器用唔到 WebGL — 暫時顯示平靜畫面，傾偈照樣得。',
    zh: '这个浏览器无法使用 WebGL — 先显示平静画面，聊天仍可正常使用。',
    ja: 'このブラウザは WebGL が使えません — 落ち着いた表示にしています。チャットは使えます。',
  },
  fallbackAsset: {
    en: 'The 3D model could not load — showing a placeholder. Chat still works.',
    yue: '3D 模型載入唔到 — 暫時顯示佔位圖，傾偈照樣得。',
    zh: '3D 模型无法加载 — 先显示占位图，聊天仍可正常使用。',
    ja: '3D モデルを読み込めません — 代わりにプレースホルダーを表示しています。チャットは使えます。',
  },
  micUnsupported: {
    en: 'Speech input is not supported in this browser — try the latest Chrome or Safari.',
    yue: '你嘅瀏覽器唔支援語音輸入，請用最新版 Chrome 或者 Safari 再試。',
    zh: '这个浏览器不支持语音输入，请使用最新版 Chrome 或 Safari 再试。',
    ja: 'このブラウザは音声入力に対応していません。最新の Chrome か Safari でお試しください。',
  },
  // Worldwide location: weather and light news follow the city she should use.
  settingsLocation: {
    en: 'Your city', yue: '你嘅城市', zh: '你的城市', ja: 'あなたの街',
  },
  locationHint: {
    en: 'Weather and light news use this city. Leave it empty to let her use your device location or network.',
    yue: '天氣同輕鬆新聞會用呢個城市。留空就會用你部機嘅位置或者網絡估計。',
    zh: '天气和轻松新闻会用这个城市。留空则使用你的设备定位或网络估计。',
    ja: '天気と軽いニュースはこの街を使うよ。空欄なら端末の位置情報かネットワーク推定を使うよ。',
  },
  locationCityPlaceholder: {
    en: 'City or city, country — e.g. Lisbon',
    yue: '城市或者「城市, 國家」——例如 里斯本',
    zh: '城市或「城市, 国家」——例如 里斯本',
    ja: '都市、または「都市, 国」— 例: リスボン',
  },
  locationSave: { en: 'Save', yue: '儲存', zh: '保存', ja: '保存' },
  locationClear: { en: 'Use my device', yue: '用我部機', zh: '用我的设备', ja: '端末の位置を使う' },
  locationSaved: {
    en: 'Saved — she will use {city} from now on.',
    yue: '記住咗——之後佢會用{city}。',
    zh: '已保存——之后她会用{city}。',
    ja: '保存したよ——これからは{city}を使うね。',
  },
  locationNotFound: {
    en: "I couldn't find that city — try adding the country.",
    yue: '搵唔到嗰個城市——試下加埋國家名。',
    zh: '找不到那个城市——试试加上国家名。',
    ja: 'その街が見つからなかった——国名も入れてみて。',
  },
  locationDetected: {
    en: 'Currently using your device or network location.',
    yue: '而家用緊你部機或者網絡嘅位置。',
    zh: '当前使用你的设备或网络位置。',
    ja: 'いまは端末かネットワークの位置を使ってるよ。',
  },
  locationNone: {
    en: 'No city yet — she will ask before talking about weather or local news.',
    yue: '仲未有城市——佢會喺講天氣或者本地新聞之前問你。',
    zh: '还没有城市——她在说天气或本地新闻之前会先问你。',
    ja: 'まだ街がないよ——天気や地元ニュースの前に聞くね。',
  },
  locationUseDevice: {
    en: 'Switch back to my device location',
    yue: '轉返用我部機嘅位置',
    zh: '恢复使用我的设备定位',
    ja: '端末の位置に戻す',
  },
  // OPTIONAL sharper brain (BYOK). Copy rule for this block: never imply the
  // app is incomplete without a key — it works fully on the free lane.
  brainAdvanced: {
    en: 'Advanced',
    yue: '進階',
    zh: '高级',
    ja: '詳細設定',
  },
  brainAdvancedHint: {
    en: 'For a sharper brain. Totally optional — she already works.',
    yue: '想要更醒嘅腦袋先用。完全自選——佢本身已經行得。',
    zh: '想让她更聪明时再用。完全可选——她本来就能聊天。',
    ja: 'もっと賢くしたい人向け。完全に任意——このままでも話せるよ。',
  },
  brainOptional: {
    en: 'Optional',
    yue: '自選',
    zh: '可选',
    ja: '任意',
  },
  brainWorksWithout: {
    en: 'This app already works without a key — a key only makes her sharper.',
    yue: '呢個 App 本身唔使鎖匙都行得——有鎖匙只係會醒啲。',
    zh: '这个应用本身不用密钥也能用——有密钥只是让她更聪明。',
    ja: 'このアプリはキーなしでも動くよ——キーがあるともっと賢くなるだけ。',
  },
  brainHide: {
    en: 'Hide key settings',
    yue: '收埋鎖匙設定',
    zh: '收起密钥设置',
    ja: 'キー設定を閉じる',
  },
  brainProvider: {
    en: 'Provider',
    yue: '供應商',
    zh: '服务商',
    ja: 'プロバイダー',
  },
  brainAuto: {
    en: 'Automatic (best available)',
    yue: '自動（用最好嘅）',
    zh: '自动（用最好的）',
    ja: '自動（いちばん良いもの）',
  },
  brainKeyLabel: {
    en: 'API key',
    yue: 'API 鎖匙',
    zh: 'API 密钥',
    ja: 'APIキー',
  },
  brainKeyPlaceholder: {
    en: 'Paste a key — saved only on this device',
    yue: '貼上鎖匙——只存喺呢部機',
    zh: '粘贴密钥——只保存在这台设备',
    ja: 'キーを貼り付け——この端末だけに保存',
  },
  brainKeyStored: {
    en: 'A key is saved on this device.',
    yue: '呢部機已經存咗一條鎖匙。',
    zh: '这台设备已保存一个密钥。',
    ja: 'この端末にキーが保存されてるよ。',
  },
  brainGetKey: {
    en: 'Get a key',
    yue: '攞鎖匙',
    zh: '获取密钥',
    ja: 'キーを取得',
  },
  brainTest: {
    en: 'Test',
    yue: '試下',
    zh: '测试',
    ja: 'テスト',
  },
  brainTesting: {
    en: 'Testing…',
    yue: '試緊…',
    zh: '测试中…',
    ja: 'テスト中…',
  },
  brainTestOk: {
    en: '{provider} works — she will use it from now on.',
    yue: '{provider} 行得——佢而家開始會用佢。',
    zh: '{provider} 可用——她现在会改用这个。',
    ja: '{provider} は使えるよ——これからこれを使うね。',
  },
  brainTestNokey: {
    en: 'Paste a key first.',
    yue: '先貼條鎖匙落去。',
    zh: '请先粘贴密钥。',
    ja: '先にキーを貼り付けてね。',
  },
  brainTestAuth: {
    en: 'The key was rejected. Check you copied all of it.',
    yue: '鎖匙唔收貨。睇下有冇抄齊。',
    zh: '密钥被拒绝。检查是否复制完整。',
    ja: 'キーが受け付けられなかった。全部コピーできたか確認してね。',
  },
  brainTestBlocked: {
    en: 'This provider is blocked from Hong Kong — no key can fix that.',
    yue: '呢個供應商喺香港連唔到——幾多鎖匙都冇用。',
    zh: '这个服务商在香港被封锁，换什么密钥都没用。',
    ja: 'このプロバイダーは香港から使えないよ——キーでは解決しない。',
  },
  brainTestModel: {
    en: 'The key works but the model id is retired here.',
    yue: '鎖匙得，但呢個型號已經冇得用。',
    zh: '密钥可用，但这个模型已下线。',
    ja: 'キーは大丈夫だけど、このモデルはもう使えない。',
  },
  brainTestCredit: {
    en: 'The key works but has no credit or quota left.',
    yue: '鎖匙得，但額度用晒喇。',
    zh: '密钥可用，但额度已用完。',
    ja: 'キーは大丈夫だけど、残高か回数が足りない。',
  },
  brainTestOffline: {
    en: 'Could not reach the provider — try again later.',
    yue: '連唔到個供應商——遲啲再試。',
    zh: '连不上服务商——稍后再试。',
    ja: 'プロバイダーに届かなかった——あとで試してね。',
  },
  brainTestTimeout: {
    en: 'The test timed out — try again.',
    yue: '測試超時——再試多次。',
    zh: '测试超时——请重试。',
    ja: 'テストが時間切れ——もう一度試してね。',
  },
  brainPrivacy: {
    en: 'The key stays in this browser and is sent only to that provider.',
    yue: '鎖匙只留喺呢個瀏覽器，只會送去嗰個供應商。',
    zh: '密钥只留在这个浏览器，只会发送给该服务商。',
    ja: 'キーはこのブラウザだけに残り、そのプロバイダーにだけ送られるよ。',
  },
  brainClearKey: {
    en: 'Remove key',
    yue: '刪除鎖匙',
    zh: '删除密钥',
    ja: 'キーを削除',
  },
  // ---- 18+ entry gate (r2026-11-08) ---------------------------------------
  // Mon's decision: Amoji is ADULT ONLY. The first screen says so plainly and
  // takes an explicit acknowledgement, because the age-rating question becomes
  // live the moment the app is submitted to a store — and because a companion
  // product that lets a child in is the wrong product.
  //
  // The audio half of the gate exists for one measured reason: the iPhone
  // hardware silent switch mutes speechSynthesis completely and NO page can
  // detect it. A user who hears nothing assumes the app is broken. So the copy
  // names that switch directly rather than saying "check your sound".
  gateStep: {
    en: 'Step {n} of {total}',
    yue: '第 {n} 步，共 {total} 步',
    zh: '第 {n} 步，共 {total} 步',
    ja: '{total} 中 {n} 番目',
  },
  gate18Title: {
    en: 'Amoji is for adults (18+)',
    yue: 'Amoji 只限成人（18+）',
    zh: 'Amoji 仅限成人（18+）',
    ja: 'Amoji は成人向けです（18+）',
  },
  gate18Body: {
    en: 'Amoji is a companion app made for grown-ups. Conversations can be intimate, and nothing here is designed, moderated, or filtered for children. If you are under 18, please close this app.',
    yue: 'Amoji 係為成年人而做嘅陪伴 App。對話可以好親密，呢度嘅內容亦冇為小朋友設計、審核或者過濾。如果你未夠 18 歲，請離開呢個 App。',
    zh: 'Amoji 是为成年人打造的陪伴应用。对话可以很亲密，这里的内容也没有为儿童设计、审核或过滤。如果你未满 18 岁，请关闭本应用。',
    ja: 'Amoji は大人のためのコンパニオンアプリです。会話は親密になることがあり、子ども向けの設計・監視・フィルタは行っていません。18歳未満の方はこのアプリを閉じてください。',
  },
  gate18Ack: {
    en: 'I am 18 or older',
    yue: '我已經滿 18 歲',
    zh: '我已满 18 岁',
    ja: '私は18歳以上です',
  },
  gate18Cta: {
    en: 'Continue',
    yue: '繼續',
    zh: '继续',
    ja: '次へ',
  },
  gateAudioTitle: {
    en: 'Amoji speaks out loud',
    yue: 'Amoji 會出聲講嘢',
    zh: 'Amoji 会出声说话',
    ja: 'Amoji は声に出して話します',
  },
  gateAudioBody: {
    en: 'She talks, laughs and reacts with sound — that is the whole point of her. If your phone is muted you will see her move but hear nothing, and the app cannot tell the difference.',
    yue: '佢會講嘢、會笑、會有反應聲——呢個就係佢。電話一靜音，你只會見到佢郁但聽唔到聲，而 App 分唔出。',
    zh: '她会说话、会笑、会发出反应声——这就是她。手机一静音，你只会看到她动却听不到声音，而应用分辨不出来。',
    ja: '彼女は話し、笑い、音で反応します。それが彼女そのものです。端末が消音だと、動いているのに何も聞こえず、アプリ側では区別できません。',
  },
  // The single most important line on this screen: the silent switch is the
  // #1 cause of "the app is broken" reports, and it is undetectable.
  gateAudioIosHint: {
    en: 'On iPhone, flip the hardware silent switch — the small switch above the volume buttons — OFF. It mutes all browser speech, and no page can detect it.',
    yue: '用 iPhone 嘅話，請將音量鍵上面嗰粒硬件靜音掣撥返去「響」嘅一邊。佢會靜音所有網頁語音，而且任何網頁都偵測唔到。',
    zh: '如果使用 iPhone，请把音量键上方的硬件静音开关拨回响铃一侧。它会让所有网页语音静音，而且任何网页都检测不到。',
    ja: 'iPhone の場合、音量ボタンの上にある本体のサイレントスイッチを「リング」側に戻してください。ブラウザの音声はすべて消音され、ページ側からは検知できません。',
  },
  gateAudioTest: {
    en: 'Test my sound',
    yue: '試吓我嘅聲音',
    zh: '测试我的声音',
    ja: '音をテストする',
  },
  gateAudioPlaying: {
    en: 'Playing…',
    yue: '播緊…',
    zh: '正在播放…',
    ja: '再生中…',
  },
  gateAudioQuestion: {
    en: 'Did you hear her just now?',
    yue: '你啱啱聽唔聽到佢把聲？',
    zh: '你刚刚听到她说话了吗？',
    ja: '今、彼女の声が聞こえましたか？',
  },
  gateAudioYes: {
    en: 'Yes, I heard her',
    yue: '聽到',
    zh: '听到了',
    ja: '聞こえた',
  },
  gateAudioNo: {
    en: 'No, I heard nothing',
    yue: '聽唔到',
    zh: '没听到',
    ja: '聞こえない',
  },
  gateHelpTitle: {
    en: 'Four things that can silence her',
    yue: '四個會令佢冇聲嘅原因',
    zh: '四个让她没声音的原因',
    ja: '音が消える4つの原因',
  },
  gateHelpSwitch: {
    en: 'Silent switch — on iPhone, the small switch above the volume buttons must be OFF (no orange showing).',
    yue: '靜音掣——iPhone 上音量鍵上面嗰粒掣要撥去唔見橙色嘅一邊。',
    zh: '静音开关——iPhone 上音量键上方的小开关要拨到不显示橙色的一侧。',
    ja: 'サイレントスイッチ——iPhone の音量ボタンの上にある小さなスイッチを、オレンジが見えない側にしてください。',
  },
  gateHelpVolume: {
    en: 'Volume — press the side buttons up while a sound is playing. Media volume is separate from the ringtone.',
    yue: '音量——播緊聲嘅時候用側邊鍵較大聲。媒體音量同鈴聲係分開嘅。',
    zh: '音量——在播放声音时用侧边键调高。媒体音量和铃声音量是分开的。',
    ja: '音量——音が鳴っている間に側面のボタンで上げてください。メディア音量は着信音とは別です。',
  },
  gateHelpBluetooth: {
    en: 'Bluetooth — if earbuds or a speaker are still connected, the sound is playing to them, not to this phone.',
    yue: '藍牙——如果耳機或者喇叭仲駁住，聲會播去嗰邊，唔會由部電話出。',
    zh: '蓝牙——如果耳机或音箱还连着，声音会播到那边，而不是这台手机。',
    ja: 'Bluetooth——イヤホンやスピーカーがつながったままだと、音はそちらに流れ、この端末からは出ません。',
  },
  gateHelpTabMuted: {
    en: 'Muted tab — a tab can be muted on its own. Right-click this tab, or look for the speaker icon on it.',
    yue: '分頁靜音——單獨一頁都可以被靜音。右撳呢個分頁，或者睇下分頁上面有冇喇叭圖示。',
    zh: '标签页静音——单个标签页也可以被静音。右键点击此标签页，或查看标签页上是否有喇叭图标。',
    ja: 'タブのミュート——タブ単体がミュートされていることがあります。このタブを右クリックするか、タブのスピーカーアイコンを確認してください。',
  },
  gateHelpRetry: {
    en: 'Test again',
    yue: '再試一次',
    zh: '再试一次',
    ja: 'もう一度テスト',
  },
  gateHelpContinue: {
    en: 'Continue anyway',
    yue: '照樣繼續',
    zh: '仍然继续',
    ja: 'このまま続ける',
  },
  gateHelpNote: {
    en: 'The app cannot hear your speaker, so only you can answer that question. If you continue without sound, her voice is still switched on — you can test it again any time in Settings.',
    yue: 'App 聽唔到你個喇叭，所以呢條問題只可以由你答。就算你冇聲都繼續，佢把聲仍然開住——你隨時可以喺設定再試。',
    zh: '应用听不到你的扬声器，所以这个问题只有你能回答。即使没有声音也继续，她的声音仍然是开着的——你随时可以在设置里再测试。',
    ja: 'アプリはスピーカーの音を聞けません。だからこの質問に答えられるのはあなただけです。音が出ないまま進んでも彼女の声は有効なままで、設定からいつでも試せます。',
  },
  gateMicTitle: {
    en: 'Microphone (optional)',
    yue: '咪高峰（可選）',
    zh: '麦克风（可选）',
    ja: 'マイク（任意）',
  },
  gateMicBody: {
    en: 'You can talk to her instead of typing. Asking now, while you are already tapping, matters on iPhone: once the microphone is denied, it stays denied for the whole page until you reload.',
    yue: '你可以用講嘅方式同佢傾，唔一定要打字。而家一次過問，係因為 iPhone 一旦拒絕咗咪高峰，成個頁面都要重新載入先用得返。',
    zh: '你可以直接用说的方式和她聊，不必打字。现在一并询问，是因为在 iPhone 上麦克风一旦被拒绝，整个页面都要重新加载才能恢复。',
    ja: '入力の代わりに話しかけられます。いま聞いておくのは、iPhone ではマイクを一度拒否すると、再読み込みするまでページ全体で使えなくなるからです。',
  },
  gateMicAllow: {
    en: 'Allow microphone',
    yue: '允許用咪高峰',
    zh: '允许使用麦克风',
    ja: 'マイクを許可',
  },
  gateMicSkip: {
    en: 'Not now',
    yue: '遲啲先',
    zh: '以后再说',
    ja: 'あとで',
  },
  gateMicGranted: {
    en: 'Microphone is ready.',
    yue: '咪高峰準備好。',
    zh: '麦克风已就绪。',
    ja: 'マイクの準備ができました。',
  },
  gateMicDenied: {
    en: 'The microphone is blocked — typing still works, and you can allow it again in your browser settings.',
    yue: '咪高峰被封鎖——打字一樣得，你亦可以喺瀏覽器設定再開返。',
    zh: '麦克风被阻止——打字仍然可用，你也可以在浏览器设置里重新允许。',
    ja: 'マイクがブロックされています——入力は使えます。ブラウザ設定で許可し直せます。',
  },
  gateMicUnsupported: {
    en: 'This browser cannot take speech input — typing works the same.',
    yue: '呢個瀏覽器收唔到語音輸入——打字一樣得。',
    zh: '这个浏览器不支持语音输入——打字一样可以。',
    ja: 'このブラウザは音声入力に対応していません——入力は同じように使えます。',
  },
  gateEnter: {
    en: 'Enter Amoji',
    yue: '入去 Amoji',
    zh: '进入 Amoji',
    ja: 'Amoji をはじめる',
  },
  settingsAdultOnly: {
    en: '18+ · adult only',
    yue: '18+ · 只限成人',
    zh: '18+ · 仅限成人',
    ja: '18+ · 成人のみ',
  },
};

export function t(lang: Lang, key: StrKey, vars?: Record<string, string>): string {
  let s = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export interface Prefs {
  character: string;
  background: string;
  lang: Lang;
  kidMode: boolean;
  /** 20 | 40 | 60 | 80 | 100 */
  sfxVol: VolumeStep;
  bgmVol: VolumeStep;
  voiceVol: VolumeStep;
  /**
   * Last female companion still in the want-list library.
   * Mini-games use her when the current pick is male or a retired id.
   */
  lastFemale?: string;
}

const KEY = 'amoji.prefs.v1';
export const DEFAULT_PREFS: Prefs = {
  character: 'a01-shino', background: 'void', lang: 'yue', kidMode: false,
  sfxVol: DEFAULT_VOLUME, bgmVol: DEFAULT_VOLUME, voiceVol: DEFAULT_VOLUME,
};

function volOf(v: unknown): VolumeStep {
  const n = Number(v);
  return isVolumeStep(n) ? n : DEFAULT_VOLUME;
}

// Kid Mode is retired (r2026-11-08, Mon's decision: ADULT ONLY).
// The `kidMode` field is deliberately KEPT in `Prefs` and in the stored JSON
// rather than deleted: it is read by chat / adaptive / companion-file today and
// lives in every existing user's localStorage, so removing it would be a
// half-migrated field that can still arrive from an old record or an imported
// .aigf card. Instead it is pinned to false on load (see loadPrefs) so no code
// path can ever turn the product back into a kid-safe one.
export const KID_CHARACTER = 'a02-shibu';
export const KID_BACKGROUND = 'meadow';
// Appended to the persona while kid mode is on (chat page). Unreachable now;
// kept so the persisted field still has a meaning if it is ever re-enabled.
export const KID_PERSONA_GUARD = '\n\nKid mode: the user is a child. Use simple, gentle, encouraging language. Never use romantic, flirty, scary, violent, or adult content. Be patient, positive, and supportive.';

/** Female want-list id. Retired roster ids and non-library models are dropped. */
export function femaleLibraryId(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c || c.gender !== 'female') return undefined;
  const model = c.model ?? '';
  if (model.includes('seed-san')) return undefined;
  if (!model.startsWith('want/') && !/^https?:\/\//.test(model)) return undefined;
  return c.id;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      // r2026-11-08 — ADULT ONLY (Mon's decision). Kid Mode is unreachable, so
      // the persisted flag is coerced to false here, the single place every
      // reader (chat, adaptive, selection board, .aigf import) goes through.
      // Notes on why it is a coercion and not a deletion:
      //  - the field still exists on old records and in imported companion
      //    cards, so a deleted field would just re-appear and be undefined;
      //  - the previous behaviour swapped the user's character/scene to the
      //    wholesome defaults when the flag was on. That is NOT done any more:
      //    an adult keeps whichever companion they actually picked, and sees
      //    the full cast and all scenes instead of a filtered subset.
      const kidMode = false;
      const storedCharacter = typeof p.character === 'string' ? p.character : DEFAULT_PREFS.character;
      let character = CHARACTERS.some((c) => c.id === storedCharacter) ? storedCharacter : DEFAULT_PREFS.character;
      if (isHiddenCast(character)) character = DEFAULT_PREFS.character;
      const background = BACKGROUNDS.some((b) => b.id === p.background) ? p.background! : DEFAULT_PREFS.background;
      const picked = CHARACTERS.find((c) => c.id === character);
      let lastFemale = femaleLibraryId(typeof p.lastFemale === 'string' ? p.lastFemale : undefined);
      if (picked?.gender === 'female') lastFemale = femaleLibraryId(picked.id) ?? lastFemale;
      if (!lastFemale) lastFemale = femaleLibraryId(DEFAULT_PREFS.character);
      const next: Prefs = {
        character,
        background,
        kidMode,
        lang: (LANGS.some((l) => l.id === p.lang) ? p.lang : DEFAULT_PREFS.lang) as Lang,
        sfxVol: volOf(p.sfxVol),
        bgmVol: volOf(p.bgmVol),
        voiceVol: volOf(p.voiceVol),
        ...(lastFemale ? { lastFemale } : {}),
      };
      // Persist migration when an old roster id (juno, kitagawa, …) no longer
      // ships, or when a stored kidMode:true was just coerced off.
      if (
        storedCharacter !== character
        || p.background !== next.background
        || p.lang !== next.lang
        || !!p.kidMode !== kidMode
        || p.lastFemale !== next.lastFemale
      ) {
        savePrefs(next);
      }
      return next;
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

export function savePrefs(p: Prefs): void {
  const picked = CHARACTERS.find((c) => c.id === p.character);
  let lastFemale = femaleLibraryId(p.lastFemale);
  if (picked?.gender === 'female') lastFemale = femaleLibraryId(picked.id) ?? lastFemale;
  if (!lastFemale) lastFemale = femaleLibraryId(DEFAULT_PREFS.character);
  // Adult-only product: never persist a kid-mode pick, even if a caller (an
  // imported .aigf card, a stale draft) hands one in.
  const base: Prefs = { ...p, kidMode: false };
  const next: Prefs = lastFemale ? { ...base, lastFemale } : base;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  scheduleStatePush();
}

export function characterById(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]!;
}
export function backgroundById(id: string): BackgroundDef {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]!;
}

/** A, B, C… from the daytime → nighttime order. Empty when the id is unknown. */
export function backgroundLetter(id: string): string {
  const i = BACKGROUNDS.findIndex((b) => b.id === id);
  if (i < 0 || i > 25) return '';
  return String.fromCharCode(65 + i);
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void, boolean] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  // false until localStorage sync - callers hold selected chrome to avoid DEFAULT_PREFS flash.
  const [ready, setReady] = useState(false);
  useEffect(() => { setPrefs(loadPrefs()); setReady(true); }, []);
  const update = (patch: Partial<Prefs>): void => {
    setPrefs((p) => {
      const next: Prefs = { ...p, ...patch };
      if (patch.character && femaleLibraryId(patch.character)) next.lastFemale = patch.character;
      savePrefs(next);
      return next;
    });
  };
  return [prefs, update, ready];
}
