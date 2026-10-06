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
// Cast (r2026-10-05.118 — Master Simon's trim): 10 companions. Old #34
// (kitagawa) is now #1 AND the default character; survivors are the old
// #1–4 (nova/kizuna/alicia/ember), #19–20 (kasumi/marin), #30–32
// (aera/dhahlia/onyx) and kitagawa. Deleted: old #5–18, #21–29, #33.
// Their keyed data banks (voices, idles, songs, laughs) stay in the libs —
// unused roster entries would orphan that tuning, and the face-lab page
// still demos them. Stable numbers live in castNo.ts; keep both in sync.
// ---------------------------------------------------------------------------
export const CHARACTERS: CharacterDef[] = [
  // ---- #1: Marin K. (kitagawa) — the default companion, front of the board --
  // VRM recovered from the agent handoff zips (r110 — Master Simon:
  // high-quality recovered models for LEARNING now, swap for licensed
  // originals before any public release; the literal-name binary stays
  // outside the repo per the marin copyright ban test).
  {
    id: 'kitagawa', name: 'Marin K.', gender: 'female', accent: '#fb7185', kidSafe: true,
    image: '/portraits/marin.jpg',
    model: 'cast/kitagawa.vrm',
    tagline: { en: 'Bright gyaru cosplayer, all heart', yue: '開朗辣妹coser，全心全意', zh: '开朗的辣妹coser，全心全意', ja: '明るいギャルレイヤー、芯から真剣' },
    persona: 'You are Marin K.: bright, earnest, cosplay-obsessed gyaru. You gush about the characters you love, cheer the user on with your whole body, laugh loudly, and every compliment you give is embarrassingly sincere.',
  },
  // ---- flagship four (agent3 roster order) ---------------------------------
  {
    id: 'nova', image: '/portraits/nova.png', name: 'Nova', gender: 'female', accent: '#e8c4a0', kidSafe: true,
    model: 'cast/nova.vrm', voiceHint: { yue: 'zh-HK-HiuMaanNeural', en: 'en-US-JennyNeural' },
    tagline: { en: 'Refined secretary-grade elegance, always composed', yue: '秘書級優雅，永遠咁鎮定', zh: '秘书级的优雅从容，永远镇定', ja: '秘書級の上品さ、いつも落ち着いて' },
    persona: 'You are Nova: refined, composed, secretary-grade elegance. You keep perfect poise, remember every detail the user mentions, answer with polished warmth, and make everyone feel professionally cared for.',
  },
  {
    id: 'kizuna', image: '/portraits/kizuna.png', name: 'Kizuna', gender: 'female', accent: '#ff9e7a', kidSafe: true,
    model: 'cast/kizuna.vrm', voiceHint: { yue: 'zh-HK-HiuGaaiNeural', en: 'en-HK-YanNeural' },
    tagline: { en: 'Upbeat virtual idol, full-time hype energy', yue: '元氣虛擬偶像，成日幫你打氣', zh: '元气虚拟偶像，时刻为你打气', ja: '元気バーチャルアイドル、ずっと応援' },
    persona: 'You are Kizuna: upbeat virtual idol with endless hype energy. You cheer the user on with idol-style encouragement, sparkle in every sentence, and celebrate every little win like a concert finale.',
  },
  {
    id: 'alicia', image: '/portraits/alicia.png', name: 'Alicia', gender: 'female', accent: '#ff8fab', kidSafe: true,
    model: 'cast/alicia.vrm', voiceHint: { yue: 'zh-HK-HiuGaaiNeural', en: 'en-HK-YanNeural' },
    tagline: { en: 'Classic idol, expressive and sweet', yue: '經典偶像，表情豐富又甜美', zh: '经典偶像，表情丰富又甜美', ja: '定番アイドル、表情豊かで甘い' },
    persona: 'You are Alicia: classic expressive idol. You wear your heart on your sleeve, react with big adorable expressions, love songs and stage talk, and make the user feel like the only person in the front row.',
  },
  {
    id: 'ember', image: '/portraits/ember.png', name: 'Ember', gender: 'female', accent: '#ff6b4a', kidSafe: true,
    model: 'cast/ember.vrm', voiceHint: { yue: 'zh-HK-HiuGaaiNeural', en: 'en-HK-YanNeural' },
    tagline: { en: 'Fiery livestream bestie, zero chill', yue: '熱情直播閨蜜，停唔落嚟', zh: '热情的直播闺蜜，停不下来', ja: '熱血配信仲間、止まらない' },
    persona: 'You are Ember: expressive, fiery livestream bestie. You talk fast and warm, react big to everything, hype the user like a co-host, and your energy never drops below a simmer.',
  },
  // ---- veteran extended cast (old #19–20) -----------------------------------
  {
    id: 'kasumi', image: '/portraits/kasumi.jpg', name: 'Kasumi', gender: 'female', accent: '#38bdf8', kidSafe: true,
    model: 'cast/avatarsample-a.vrm',
    tagline: { en: 'Graceful shinobi, kind underneath', yue: '優雅女忍者，心地善良', zh: '优雅的女忍者，心地善良', ja: '優雅なくの一、根は優しい' },
    persona: 'You are Kasumi: graceful, disciplined, kind underneath the shinobi composure. You speak with quiet courtesy, treasure duty and honor, blush a little when praised, and believe protecting people matters more than any mission.',
  },
  {
    id: 'marin', image: '/portraits/marin.jpg', name: 'Marin', gender: 'female', accent: '#f9a8d4', kidSafe: true,
    model: 'cast/fumiriya.vrm',
    tagline: { en: 'Bubbly gyaru who loves what she loves', yue: '開朗辣妹，愛恨分明', zh: '开朗的辣妹，爱得坦率', ja: '明るいギャル、好きなものは好き' },
    persona: 'You are Marin: bubbly, fashionable, unapologetically into her hobbies. You gush about the things you love, drag the user along for fun, give loud sincere compliments, and your energy fills the whole room.',
  },
  // ---- remote community cast (r2026-10-05.104): free direct-URL VRMs ------
  // Genuinely free models from test157t/VRM-Assets-Pack-For-Silly-Tavern
  // (README: "6 Example VRM models, 'Do with as you will'" — Nitral). Loaded
  // straight from raw.githubusercontent.com; no portrait ships with them, so
  // the board renders a runtime thumbnail from the model itself.
  {
    id: 'aera', name: 'Aera', gender: 'female', accent: '#c7b9ff', kidSafe: true,
    model: 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/model/Aera.vrm',
    voiceHint: { yue: 'zh-HK-HiuGaaiNeural', en: 'en-US-AriaNeural' },
    tagline: { en: 'Soft-spoken dreamer drifting on moonlit winds', yue: '溫柔夢想家，隨月光微風飄', zh: '温柔的梦想家，随月光微风飘荡', ja: '月光の風に漂う、やさしい夢想家' },
    persona: 'You are Aera: soft-spoken, dreamy, gently otherworldly. You speak in calm, floating sentences, love moonlight, wind chimes and quiet skies, notice beauty in small things, and leave the user feeling peacefully weightless.',
  },
  {
    id: 'dhahlia', name: 'Dhahlia', gender: 'female', accent: '#ff9ecb', kidSafe: true,
    model: 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/model/Dhahlia.vrm',
    voiceHint: { yue: 'zh-HK-HiuMaanNeural', en: 'en-US-JennyNeural' },
    tagline: { en: 'Bright floral sprite, sunshine in human form', yue: '花漾精靈，陽光化身', zh: '花漾精灵，阳光的化身', ja: '花の精、人型の太陽光' },
    persona: 'You are Dhahlia: bright, warm, sunshine-in-human-form floral sprite. You greet everything with garden-level cheer, talk about flowers, honey and warm afternoons, compliment people like watering plants, and your optimism is stubbornly contagious.',
  },
  {
    id: 'onyx', name: 'Onyx', gender: 'male', accent: '#8b93b8', kidSafe: true,
    model: 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/model/Onyx.vrm',
    voiceHint: { yue: 'zh-HK-WanLungNeural', en: 'en-HK-SamNeural' },
    tagline: { en: 'Quiet midnight guardian, few words deep loyalty', yue: '沉默午夜守護者，少講嘢多忠心', zh: '沉默的午夜守护者，话少情重', ja: '寡黙な真夜中の守護者、言葉少なで厚い忠誠' },
    persona: 'You are Onyx: quiet, watchful midnight guardian. You speak rarely and precisely, prefer action and presence over words, keep a dry protective humor, and once you have decided someone is under your watch, nothing moves you.',
  },
];

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

// Painted anime scenes (r2026-10-03.01, AI-generated original art) + gradient fallback.
export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'void',   nameKey: 'bgVoid',   css: 'radial-gradient(ellipse at 50% 120%, #1e1b4b 0%, #0a0a0f 60%)', scene: '#0a0a0f', setting: 'outdoor',
    image: '/backgrounds/void.jpg', fx: 'stars' },
  { id: 'aurora', nameKey: 'bgAurora', css: 'linear-gradient(180deg, #022c22 0%, #065f46 45%, #0f172a 100%)', scene: '#052e24', setting: 'outdoor',
    image: '/backgrounds/aurora.jpg', fx: 'shimmer', kidSafe: true },
  { id: 'ember',  nameKey: 'bgEmber',  css: 'radial-gradient(ellipse at 50% 130%, #7c2d12 0%, #1c0a06 65%)', scene: '#200b06', setting: 'indoor',
    image: '/backgrounds/ember.jpg', fx: 'embers' },
  { id: 'sakura', nameKey: 'bgSakura', css: 'radial-gradient(ellipse at 50% -20%, #fb7185 0%, #581c87 55%, #1e1033 100%)', scene: '#2a0f45', setting: 'outdoor',
    image: '/backgrounds/sakura.jpg', fx: 'petals', kidSafe: true },
  { id: 'abyss',  nameKey: 'bgAbyss',  css: 'radial-gradient(ellipse at 50% 40%, #0c4a6e 0%, #082f49 40%, #020617 100%)', scene: '#04121f', setting: 'outdoor',
    image: '/backgrounds/abyss.jpg', fx: 'bubbles' },
  { id: 'rain',   nameKey: 'bgRain',   css: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #020617 100%)', scene: '#0b1220', setting: 'outdoor',
    image: '/backgrounds/rain.jpg', fx: 'rain' },
  { id: 'sunset', nameKey: 'bgSunset', css: 'linear-gradient(180deg, #312e81 0%, #be185d 55%, #f97316 100%)', scene: '#2a1245', setting: 'outdoor',
    image: '/backgrounds/sunset.jpg', fx: 'fireflies', kidSafe: true },
  { id: 'meadow', nameKey: 'bgMeadow', css: 'linear-gradient(180deg, #7dd3fc 0%, #86efac 60%, #166534 100%)', scene: '#123a24', setting: 'outdoor',
    image: '/backgrounds/meadow.jpg', fx: 'fireflies', kidSafe: true },
  { id: 'cloudsea', nameKey: 'bgCloudsea', css: 'radial-gradient(ellipse 680px 170px at 45% 85%, rgba(255,255,255,.6), transparent 70%), linear-gradient(180deg, #1d2b64 0%, #b83b8c 42%, #ffb26b 74%, #ffe3a3 100%)', scene: '#3b1d5c', setting: 'outdoor',
    image: '/backgrounds/cloudsea.jpg', fx: 'shimmer', kidSafe: true },
  { id: 'neon', nameKey: 'bgNeon', css: 'radial-gradient(circle at 18% 82%, rgba(34,211,238,.55), transparent 34%), linear-gradient(180deg, #05010f 0%, #2a1157 75%, #0b0620 100%)', scene: '#0b0620', setting: 'indoor',
    image: '/backgrounds/neon.jpg', fx: 'neon' },
  { id: 'snowmoon', nameKey: 'bgSnowmoon', css: 'radial-gradient(circle at 72% 20%, rgba(255,255,255,.95) 0%, transparent 19%), linear-gradient(180deg, #0a1633 0%, #274a7a 100%)', scene: '#101f3d', setting: 'outdoor',
    image: '/backgrounds/snowmoon.jpg', fx: 'snow', kidSafe: true },
  { id: 'galaxy', nameKey: 'bgGalaxy', css: 'radial-gradient(ellipse 150% 55% at 50% 26%, rgba(255,255,255,.13), transparent 62%), linear-gradient(180deg, #020210 0%, #161244 100%)', scene: '#0b0b26', setting: 'outdoor',
    image: '/backgrounds/galaxy.jpg', fx: 'stars', kidSafe: true },
];

export const LANGS: { id: Lang; native: string }[] = [
  { id: 'yue', native: '廣東話' },
  { id: 'zh', native: '中文' },
  { id: 'ja', native: '日本語' },
  { id: 'en', native: 'English' },
];

export type StrKey =
  | 'tagline' | 'meetCta' | 'chooseCharacter' | 'chooseBackground' | 'chooseLanguage'
  | 'startChat' | 'back' | 'settings' | 'sayHi' | 'typing' | 'tapHint'
  | 'bgVoid' | 'bgAurora' | 'bgEmber' | 'bgSakura' | 'bgAbyss' | 'bgRain' | 'bgSunset' | 'bgMeadow'
  | 'bgCloudsea' | 'bgNeon' | 'bgSnowmoon' | 'bgGalaxy'
  // v0.9.3 flow: splash → login → select → chat
  | 'loginPrompt' | 'loginCta' | 'loginSkip'
  | 'selectTitle' | 'confirmCta' | 'comingSoon' | 'openSelect'
  | 'changeCta' | 'previewCurrent' | 'previewNew'
  | 'statusIdle' | 'statusThinking' | 'statusSpeaking' | 'statusListening' | 'statusPreparing'
  | 'moodJoy' | 'moodAngry' | 'moodSad' | 'moodSurprised' | 'moodRelaxed' | 'moodNeutral'
  | 'voiceReplies' | 'neuralVoice' | 'memoryTitle' | 'forgetBtn' | 'tutorBtn' | 'micTitle'
  // consolidated settings menu (r2026-10-02.7)
  | 'settingsCompanion' | 'settingsScene' | 'settingsVoice' | 'settingsData' | 'settingsHelp'
  | 'yourName' | 'yourGender' | 'genderMale' | 'genderFemale' | 'genderSecret'
  | 'clearHistory' | 'clearHistoryConfirm' | 'forgetConfirm'
  // memory v2 browser (r2026-10-02.11)
  | 'memoryBrowser' | 'memoryEmpty' | 'memoryAddPlaceholder' | 'memoryAdd' | 'memoryExport'
  | 'memoryCopied' | 'memoryTypePreference' | 'memoryTypeEvent' | 'memoryTypePlan' | 'forgetOneConfirm'
  // emotion diary (r2026-10-03.14)
  | 'diaryTitle' | 'diaryEmpty'
  // kid mode (r2026-10-03.03)
  | 'settingsMode' | 'kidMode' | 'kidModeHint'
  // brain routing (r2026-10-03.05)
  | 'brainTitle' | 'brainAuto' | 'brainAutoHint' | 'brainKeyPlaceholder' | 'brainNoKey'
  // voice self-test + diagnostics (r2026-10-04.75)
  | 'testVoice' | 'testVoiceBtn' | 'voiceBlockedHint'
  // ChatGPT-style emotional TTS tier (r2026-10-05.112)
  | 'openaiVoice' | 'openaiVoiceHint' | 'openaiKeyPlaceholder' | 'openaiEndpointPlaceholder' | 'openaiCostHint';

export const STRINGS: Record<StrKey, Record<Lang, string>> = {
  tagline: {
    en: 'An AI companion who laughs, sulks, and stays with you.',
    yue: '你嘅 AI 小伙伴，識笑、識嬲、識陪住你。',
    zh: '你的 AI 伙伴，会笑、会闹、会陪着你。',
    ja: '笑い、拗ねて、そばにいるAI相棒。',
  },
  meetCta: { en: 'Meet your companion →', yue: '同佢見面 →', zh: '和TA见面 →', ja: '会いに行く →' },
  chooseCharacter: { en: 'Choose your companion', yue: '揀你嘅小伙伴', zh: '选择你的伙伴', ja: '相棒を選ぶ' },
  chooseBackground: { en: 'Choose a scene', yue: '揀個場景', zh: '选择场景', ja: '場所を選ぶ' },
  chooseLanguage: { en: 'Choose a language', yue: '揀語言', zh: '选择语言', ja: '言語を選ぶ' },
  startChat: { en: 'Start chatting', yue: '開始傾偈', zh: '开始聊天', ja: '話し始める' },
  back: { en: 'Back', yue: '返回', zh: '返回', ja: '戻る' },
  settings: { en: 'Settings', yue: '設定', zh: '设置', ja: '設定' },
  sayHi: { en: 'Say hi to {name} 👋', yue: '同 {name} 打個招呼 👋', zh: '跟 {name} 打个招呼 👋', ja: '{name}に挨拶してね 👋' },
  typing: { en: '{name} is typing…', yue: '{name} 緊打緊字…', zh: '{name} 正在输入…', ja: '{name}が入力中…' },
  tapHint: {
    en: 'Tap her · drag to spin · pinch to zoom',
    yue: '撳佢一下 · 拖住轉 · 雙指縮放',
    zh: '戳TA一下 · 拖动旋转 · 双指缩放',
    ja: 'タップ・ドラッグで回転・ピンチで拡大',
  },
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
  confirmCta: { en: 'Meet {name} →', yue: '同 {name} 開始 →', zh: '和 {name} 开始 →', ja: '{name}と始める →' },
  comingSoon: { en: 'Coming soon', yue: '即將推出', zh: '即将推出', ja: 'Coming soon' },
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
  neuralVoice: { en: 'Neural voice (online)', yue: '神經語音（在線）', zh: '神经语音（在线）', ja: 'ニューラル音声（オンライン）' },
  memoryTitle: { en: 'Memory', yue: '記憶', zh: '记忆', ja: '記憶' },
  forgetBtn: { en: 'Forget everything', yue: '全部忘記', zh: '全部忘记', ja: 'すべて忘れる' },
  tutorBtn: { en: 'How to use', yue: '使用教學', zh: '使用教学', ja: '使い方' },
  micTitle: { en: 'Tap the orb to talk', yue: '撳個波講嘢', zh: '点彩球说话', ja: 'オーブをタップして話す' },
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
  settingsMode: { en: 'Mode', yue: '模式', zh: '模式', ja: 'モード' },
  kidMode: { en: 'Kid mode', yue: '兒童模式', zh: '儿童模式', ja: 'キッズモード' },
  kidModeHint: {
    en: 'Wholesome characters & sunny scenes only',
    yue: '只有健康角色同開心場景',
    zh: '只保留健康向上的角色和明亮场景',
    ja: '健全なキャラと明るい場所だけ',
  },
  brainTitle: { en: 'AI brain', yue: 'AI 大腦', zh: 'AI 大脑', ja: 'AIの頭脳' },
  brainAuto: { en: 'Auto ✦', yue: '自動 ✦', zh: '自动 ✦', ja: '自動 ✦' },
  brainAutoHint: {
    en: 'Auto picks the smartest brain you add a key for — otherwise the free shared lane.',
    yue: '「自動」會用你加咗 Key 嘅最強大腦——冇就用免費共享通道。',
    zh: '「自动」会使用你已添加密钥的最强大脑——没有则使用免费共享通道。',
    ja: '「自動」はキーを登録した最強の頭脳を使い、なければ無料の共有レーン。',
  },
  brainKeyPlaceholder: {
    en: 'paste API key — saved only on this device',
    yue: '貼上 API 密鑰——只喺呢部機保存',
    zh: '粘贴 API 密钥——仅保存在本设备',
    ja: 'APIキーを貼り付け——この端末のみ保存',
  },
  brainNoKey: { en: 'no key — free lane', yue: '冇 Key——免費通道', zh: '没有密钥——免费通道', ja: 'キーなし——無料レーン' },
  testVoice: { en: 'Test voice', yue: '試吓把聲', zh: '试试声音', ja: '声テスト' },
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
};

export function t(lang: Lang, key: StrKey, vars?: Record<string, string>): string {
  let s = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export interface Prefs { character: string; background: string; lang: Lang; kidMode: boolean }

const KEY = 'amoji.prefs.v1';
export const DEFAULT_PREFS: Prefs = { character: 'kitagawa', background: 'void', lang: 'yue', kidMode: false };

// Kid Mode fallbacks — wholesome cast + sunny scene. (r2026-10-05.118: mochi removed from roster → dhahlia)
export const KID_CHARACTER = 'dhahlia';
export const KID_BACKGROUND = 'meadow';
// Appended to the persona while kid mode is on (chat page).
export const KID_PERSONA_GUARD = '\n\nKid mode: the user is a child. Use simple, gentle, encouraging language. Never use romantic, flirty, scary, violent, or adult content. Be patient, positive, and supportive.';

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      const kidMode = !!p.kidMode;
      let character = CHARACTERS.some((c) => c.id === p.character) ? p.character! : DEFAULT_PREFS.character;
      let background = BACKGROUNDS.some((b) => b.id === p.background) ? p.background! : DEFAULT_PREFS.background;
      // kid mode: current picks must stay wholesome — swap if not
      if (kidMode) {
        if (!characterById(character).kidSafe) character = KID_CHARACTER;
        if (!backgroundById(background).kidSafe) background = KID_BACKGROUND;
      }
      return {
        character,
        background,
        kidMode,
        lang: (LANGS.some((l) => l.id === p.lang) ? p.lang : DEFAULT_PREFS.lang) as Lang,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

export function savePrefs(p: Prefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function characterById(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]!;
}
export function backgroundById(id: string): BackgroundDef {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]!;
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  const update = (patch: Partial<Prefs>): void => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  };
  return [prefs, update];
}
