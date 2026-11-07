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
  // kid mode (r2026-10-03.03)
  | 'settingsMode' | 'kidMode' | 'kidModeHint'
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
  // OPTIONAL bring-your-own API key (r2026-11-08). Keys are `byok*` so this
  // block cannot collide with another worker's `brain*` additions; keep it
  // last and contiguous.
  | 'byokTitle' | 'byokHint' | 'byokWorksWithout' | 'byokProvider' | 'byokAuto'
  | 'byokKeyLabel' | 'byokKeyPlaceholder' | 'byokLocalOnly' | 'byokGetKey'
  | 'byokNoKey' | 'byokNoKeyNeeded' | 'byokKeySaved' | 'byokSave' | 'byokRemove'
  | 'byokTest' | 'byokTesting'
  | 'byokTestOk' | 'byokTestNokey' | 'byokTestAuth' | 'byokTestBlocked'
  | 'byokTestModel' | 'byokTestCredit' | 'byokTestOffline' | 'byokTestTimeout' | 'byokTestError'
  | 'byokTestDetail'
  | 'byokTierDeepseek' | 'byokTierMoonshot' | 'byokTierGroq' | 'byokTierOpenrouter'
  | 'byokTierPollinations'
  | 'byokRegionGroq' | 'byokRegionOpenrouter';

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
  kidMode: { en: 'Kid mode', yue: '兒童模式', zh: '儿童模式', ja: 'キッズモード' },
  kidModeHint: {
    en: 'Wholesome characters & sunny scenes only',
    yue: '只有健康角色同開心場景',
    zh: '只保留健康向上的角色和明亮场景',
    ja: '健全なキャラと明るい場所だけ',
  },
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
  // ---- optional bring-your-own API key (r2026-11-08) -------------------------
  // Copy rule for this block: BYOK is an OPTION, never a setup step. The app
  // already answers with no key, and every line here has to say so out loud.
  byokTitle: {
    en: 'Sharper brain',
    yue: '更叻嘅腦',
    zh: '更强的大脑',
    ja: 'もっと賢い頭脳',
  },
  byokHint: {
    en: 'Add your own API key to get faster, sharper replies. Pick a provider, paste the key, then tap Test.',
    yue: '加自己嘅 API key，回覆會快啲、醒啲。揀個供應商、貼上 key，再撳「試一試」。',
    zh: '加上你自己的 API 密钥，回复会更快、更聪明。选择服务商，粘贴密钥，然后点「测一测」。',
    ja: '自分のAPIキーを入れると、返事が速く、賢くなります。提供元を選んでキーを貼り、「テスト」を押してください。',
  },
  byokWorksWithout: {
    en: 'She already works without a key — this is only if you want her sharper.',
    yue: '冇 key 佢都照樣傾得——呢個純粹係想佢再叻啲先加。',
    zh: '没有密钥她也照常能聊——这只在你希望她更聪明时才需要。',
    ja: 'キーがなくても彼女は話せます。もっと賢くしたいときだけ設定してね。',
  },
  byokProvider: {
    en: 'Provider',
    yue: '供應商',
    zh: '服务商',
    ja: '提供元',
  },
  byokAuto: {
    en: 'Automatic (best available)',
    yue: '自動（用最好嘅）',
    zh: '自动（用最好的）',
    ja: '自動（いちばん良いもの）',
  },
  byokKeyLabel: {
    en: 'API key',
    yue: 'API 密鑰',
    zh: 'API 密钥',
    ja: 'APIキー',
  },
  byokKeyPlaceholder: {
    en: 'Paste the key here — it never leaves this device',
    yue: '喺度貼個 key——佢唔會離開呢部機',
    zh: '在这里粘贴密钥——它不会离开这台设备',
    ja: 'ここにキーを貼り付け——この端末から出ません',
  },
  byokLocalOnly: {
    en: 'Saved only in this browser on this device. It is never sent to us, never logged, and never saved in the app’s files.',
    yue: '只會存喺呢部機嘅瀏覽器度。絕對唔會傳俾我哋、唔會寫落記錄、亦唔會存入程式嘅檔案。',
    zh: '只保存在这台设备的这个浏览器里。绝不会发给我们，不会写进日志，也不会存进应用的文件。',
    ja: 'この端末のこのブラウザにだけ保存されます。こちらへ送られることも、ログに残ることも、アプリのファイルに入ることもありません。',
  },
  byokGetKey: {
    en: 'Get a key →',
    yue: '攞個 key →',
    zh: '获取密钥 →',
    ja: 'キーを取得 →',
  },
  byokNoKey: {
    en: 'No key saved yet.',
    yue: '仲未存 key。',
    zh: '还没有保存密钥。',
    ja: 'キーはまだ保存されていません。',
  },
  byokNoKeyNeeded: {
    en: 'This one needs no key at all — nothing to paste.',
    yue: '呢個完全唔使 key——冇嘢要貼。',
    zh: '这个完全不需要密钥——没有要粘贴的东西。',
    ja: 'これはキーが不要です。貼り付けるものはありません。',
  },
  byokKeySaved: {
    en: 'Key saved on this device.',
    yue: 'Key 已經存喺呢部機。',
    zh: '密钥已保存在这台设备。',
    ja: 'キーをこの端末に保存しました。',
  },
  byokSave: {
    en: 'Save',
    yue: '儲存',
    zh: '保存',
    ja: '保存',
  },
  byokRemove: {
    en: 'Remove',
    yue: '刪除',
    zh: '删除',
    ja: '削除',
  },
  byokTest: {
    en: 'Test',
    yue: '試一試',
    zh: '测一测',
    ja: 'テスト',
  },
  byokTesting: {
    en: 'Testing…',
    yue: '試緊…',
    zh: '正在测试…',
    ja: 'テスト中…',
  },
  // One verdict per failure cause, so the Test button always says something
  // actionable instead of a bare ✗.
  byokTestOk: {
    en: 'It works — she will use this key from now on.',
    yue: '得咗——之後佢就會用呢個 key。',
    zh: '成功了——之后她就会用这个密钥。',
    ja: '成功しました——これからこのキーを使います。',
  },
  byokTestNokey: {
    en: 'Paste a key first, then test it.',
    yue: '先貼個 key 落去，再試。',
    zh: '请先粘贴密钥，然后再测。',
    ja: 'まずキーを貼り付けてからテストしてね。',
  },
  byokTestAuth: {
    en: 'The provider rejected this key. Check you copied the whole thing, and that it is not expired or deleted.',
    yue: '供應商唔認得呢個 key。睇下係咪複製齊晒，同埋個 key 有冇過期或者刪咗。',
    zh: '服务商不认这个密钥。请检查是否复制完整，以及密钥是否已过期或被删除。',
    ja: '提供元がこのキーを受け付けませんでした。全部コピーできているか、期限切れや削除がないか確認してね。',
  },
  byokTestBlocked: {
    en: 'The provider refused the connection from your network or region — the key itself was not even checked. Try another provider, or a network where this one is reachable.',
    yue: '供應商拒絕咗你個網絡或者地區嘅連線——連個 key 都未睇過。試下第二個供應商，或者轉去連得到嘅網絡。',
    zh: '服务商拒绝了你所在网络或地区的连接——连密钥都还没检查。请换一个服务商，或换到能连上它的网络。',
    ja: 'お使いの回線・地域からの接続を提供元が拒否しました。キーの確認まで届いていません。別の提供元か、つながる回線で試してね。',
  },
  byokTestModel: {
    en: 'This key works, but that model is no longer offered. Pick another provider, or tell us and we will update the list.',
    yue: '個 key 冇問題，不過嗰個型號已經冇得用。揀過第二個供應商，或者話俾我哋知，我哋更新個清單。',
    zh: '密钥没问题，但这个模型已经下架了。请换一个服务商，或告诉我们，我们会更新列表。',
    ja: 'キーは有効ですが、そのモデルはもう提供されていません。別の提供元を選ぶか、教えてくれれば一覧を更新します。',
  },
  byokTestCredit: {
    en: 'This key is out of credit or over its free quota for today. Top it up or wait for the quota to reset.',
    yue: '呢個 key 冇額度喇，或者今日嘅免費額度用晒。增值或者等額度重置。',
    zh: '这个密钥额度用完了，或者今天的免费额度已用尽。请充值或等额度重置。',
    ja: 'このキーは残高切れか、本日の無料枠を使い切りました。チャージするか、枠のリセットを待ってね。',
  },
  byokTestOffline: {
    en: 'Could not reach the provider at all — check your internet connection (or a firewall blocking it), then test again.',
    yue: '完全連唔到個供應商——睇下你個網絡（或者防火牆擋住），再試一次。',
    zh: '完全连不上服务商——请检查你的网络（或被防火墙拦截），然后再测一次。',
    ja: '提供元にまったく届きませんでした。インターネット接続（またはファイアウォール）を確認して、もう一度テストしてね。',
  },
  byokTestTimeout: {
    en: 'The provider took too long to answer. It may be busy — try again in a moment.',
    yue: '供應商太耐都冇回應，可能好忙——等一陣再試。',
    zh: '服务商太久没有回应，可能正忙——请稍后再测。',
    ja: '提供元の応答が遅すぎました。混み合っているかもしれないので、少し待ってからもう一度。',
  },
  byokTestError: {
    en: 'The provider returned an error. The exact reply is shown below.',
    yue: '供應商回咗個錯誤，佢原本講嘅嘢喺下面。',
    zh: '服务商返回了错误，它原本的内容显示在下面。',
    ja: '提供元がエラーを返しました。実際の応答を下に表示します。',
  },
  byokTestDetail: {
    en: 'Provider said: {detail}',
    yue: '供應商話：{detail}',
    zh: '服务商说：{detail}',
    ja: '提供元の応答：{detail}',
  },
  // Plain-language allowance, per provider. Numbers verified 2026-11-08 against
  // each provider's own published limits.
  byokTierDeepseek: {
    en: 'Pay as you go — no monthly fee. Roughly US$0.001 per chat turn; no free plan is published, so top up a little first.',
    yue: '用幾多計幾多——冇月費。大約每次對話 US$0.001；官方冇公布免費額度，所以先入少少錢。',
    zh: '按用量计费——没有月费。每次对话约 US$0.001；官方没有公布免费额度，请先充值少量。',
    ja: '使った分だけの後払いで、月額はありません。1回の会話で約0.001米ドル。無料枠は公表されていないので、少しだけ入金してね。',
  },
  byokTierMoonshot: {
    en: 'Pay as you go; you must add at least US$1 before the first call. Mainland-China sign-ups get a ¥15 voucher for 3 months.',
    yue: '用幾多計幾多；第一次用之前最少要入 US$1。中國大陸登記嘅新用戶有 ¥15 代金券，有效三個月。',
    zh: '按用量计费；首次调用前至少充值 US$1。中国大陆注册的新用户有 ¥15 代金券，有效期三个月。',
    ja: '使った分だけの後払いで、初回の前に1米ドル以上の入金が必要です。中国本土で登録した新規ユーザーには15元のクーポン（3か月有効）があります。',
  },
  byokTierGroq: {
    en: 'Free plan: 1,000 requests a day and 30 a minute — no card needed.',
    yue: '免費計劃：每日 1,000 次、每分鐘 30 次——唔使信用卡。',
    zh: '免费计划：每天 1,000 次、每分钟 30 次——无需信用卡。',
    ja: '無料プランは1日1,000回・1分30回まで。カード登録は不要です。',
  },
  byokTierOpenrouter: {
    en: 'Free models: 50 requests a day and 20 a minute. Buying 10 credits once raises it to 1,000 a day.',
    yue: '免費模型：每日 50 次、每分鐘 20 次。一次性買 10 credits 就會升到每日 1,000 次。',
    zh: '免费模型：每天 50 次、每分钟 20 次。一次性购买 10 credits 可升到每天 1,000 次。',
    ja: '無料モデルは1日50回・1分20回まで。10クレジットを一度購入すると1日1,000回に増えます。',
  },
  byokTierPollinations: {
    en: 'No key at all — a free shared queue. Slower when lots of people are chatting.',
    yue: '完全唔使 key——免費共用隊列。多人傾嘅時候會慢啲。',
    zh: '完全不需要密钥——免费共享队列。人多的时后会慢一些。',
    ja: 'キーは不要です。無料の共用キューなので、混んでいるときは遅くなります。',
  },
  // Regional notes. Only the two we could verify are written; silence beats a
  // confident guess.
  byokRegionGroq: {
    en: 'Not reachable from Hong Kong or mainland China — verified here: the endpoint refuses the connection itself, before any key is checked.',
    yue: '香港同中國大陸連唔到——我哋實測過：個端點自己拒絕連線，連 key 都未睇。',
    zh: '香港和中国大陆无法连接——我们实测过：接口本身拒绝连接，连密钥都还没检查。',
    ja: '香港と中国本土からは接続できません（こちらで実測）。キーを確認する前に、接続そのものが拒否されます。',
  },
  byokRegionOpenrouter: {
    en: 'Works from Hong Kong and mainland China, but GPT, Claude and Gemini models stay blocked for accounts billed there. The free router here is fine.',
    yue: '香港同中國大陸都連得到，不過帳單地址喺嗰度嘅帳戶用唔到 GPT、Claude、Gemini。呢度用嘅免費路由冇問題。',
    zh: '香港和中国大陆可以连接，但账单地址在那里的账户无法使用 GPT、Claude、Gemini。这里用的免费路由不受影响。',
    ja: '香港と中国本土からも使えますが、その地域の請求先のアカウントではGPT・Claude・Geminiが使えません。ここの無料ルーターは問題ありません。',
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

// Kid Mode fallbacks — wholesome cast + sunny scene (female default from want list)
export const KID_CHARACTER = 'a02-shibu';
export const KID_BACKGROUND = 'meadow';
// Appended to the persona while kid mode is on (chat page).
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
      const kidMode = !!p.kidMode;
      const storedCharacter = typeof p.character === 'string' ? p.character : DEFAULT_PREFS.character;
      let character = CHARACTERS.some((c) => c.id === storedCharacter) ? storedCharacter : DEFAULT_PREFS.character;
      if (isHiddenCast(character)) character = DEFAULT_PREFS.character;
      let background = BACKGROUNDS.some((b) => b.id === p.background) ? p.background! : DEFAULT_PREFS.background;
      // kid mode: current picks must stay wholesome — swap if not
      if (kidMode) {
        if (!characterById(character).kidSafe) character = KID_CHARACTER;
        if (!backgroundById(background).kidSafe) background = KID_BACKGROUND;
      }
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
      // Persist migration when an old roster id (juno, kitagawa, …) no longer ships.
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
  const next: Prefs = lastFemale ? { ...p, lastFemale } : p;
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
