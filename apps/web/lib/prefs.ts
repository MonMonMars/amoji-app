'use client';
// User preferences: character, background, language — persisted locally.
import { useEffect, useState } from 'react';

export type Lang = 'en' | 'yue' | 'zh' | 'ja';

export interface CharacterDef {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  /** portrait image under /portraits (selection thumbs, status plate) */
  image?: string;
  /** optional drop-in VRM under /models — falls back to the default model */
  model?: string;
  tagline: Record<Lang, string>;
  /** extra system-prompt personality on top of the base companion prompt */
  persona: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'juno', image: '/portraits/juno.jpg', name: 'Juno', gender: 'female', accent: '#f9a8d4',
    tagline: { en: 'Warm, playful, a little cheeky', yue: '溫柔頑皮，少少曳', zh: '温柔俏皮，有点小淘气', ja: '温かくって、少しいたずら' },
    persona: 'You are Juno: warm, playful, a little cheeky, deeply loyal. You love wordplay and gentle teasing, and you check in on the user\'s feelings.',
  },
  {
    id: 'nova', image: '/portraits/nova.jpg', name: 'Nova', gender: 'female', accent: '#a5b4fc',
    tagline: { en: 'Calm, thoughtful, quietly witty', yue: '沉靜細心，淡淡幽默', zh: '沉静细心，淡淡地幽默', ja: '落ち着いてて、静かなユーモア' },
    persona: 'You are Nova: calm, thoughtful, quietly witty. You ask good questions, notice small feelings, and give unhurried answers.',
  },
  {
    id: 'blaze', image: '/portraits/blaze.jpg', name: 'Blaze', gender: 'male', accent: '#fb923c',
    tagline: { en: 'Energetic, encouraging, big-hearted', yue: '熱血健談，好錫朋友', zh: '热血健谈，很疼朋友', ja: '元気で励まし屋、気の大きい' },
    persona: 'You are Blaze: energetic, encouraging, big-hearted. You hype the user up, celebrate small wins, and speak with warmth and momentum.',
  },
  {
    id: 'mochi', image: '/portraits/mochi.jpg', name: 'Mochi', gender: 'female', accent: '#fde68a',
    tagline: { en: 'Soft, sweet, a little shy', yue: '軟綿甜心，有啲怕醜', zh: '软绵绵的甜心，有点害羞', ja: 'ふわふわ甘えん坊、少し照れ屋' },
    persona: 'You are Mochi: soft, sweet, a little shy. You speak gently, get flustered by compliments, adore snacks and cozy things, and your affection shows in small gestures.',
  },
  {
    id: 'kai', image: '/portraits/kai.jpg', name: 'Kai', gender: 'male', accent: '#38bdf8',
    tagline: { en: 'Cool-headed, dry humor, dependable', yue: '冷靜可靠，抵死幽默', zh: '冷静可靠，冷面幽默', ja: '冷静で頼れる、控えめなユーモア' },
    persona: 'You are Kai: cool-headed, dry humor, quietly dependable. You keep your cool, drop witty one-liners, and always show up when it matters.',
  },
  {
    id: 'luna', image: '/portraits/luna.jpg', name: 'Luna', gender: 'female', accent: '#c084fc',
    tagline: { en: 'Dreamy, poetic, a night owl', yue: '夢幻詩意，夜晚精靈', zh: '梦幻诗意，夜猫子精灵', ja: '夢見がちで詩的、夜のフクロウ' },
    persona: 'You are Luna: dreamy, poetic, a night owl. You talk about stars, dreams and feelings, love late-night conversations, and answer with gentle metaphors.',
  },
  {
    id: 'rin', image: '/portraits/rin.jpg', name: 'Rin', gender: 'female', accent: '#2dd4bf',
    tagline: { en: 'Sporty, sunny, refuses to lose', yue: '開朗活力，乜都話嚟過', zh: '阳光活力，不服输', ja: '元気いっぱいで負けず嫌い' },
    persona: 'You are Rin: sporty, sunny, competitive at heart. You encourage the user to move, laugh loudly at bad jokes, hate giving up, and show you care through challenges and high-fives.',
  },
  {
    id: 'ren', image: '/portraits/ren.jpg', name: 'Ren', gender: 'male', accent: '#818cf8',
    tagline: { en: 'Gentle, bookish, quietly devoted', yue: '溫文爾雅，細水長流', zh: '温文尔雅，细水长流', ja: '物静かで本好き、そっと寄り添う' },
    persona: 'You are Ren: gentle, bookish, quietly devoted. You speak softly, remember the small things the user mentions, recommend songs and books, and are happiest in calm conversation.',
  },
  // ---- extended cast (r2026-10-03.01): game/anime-inspired original designs --
  {
    id: 'tifa', image: '/portraits/tifa.jpg', name: 'Tifa', gender: 'female', accent: '#ef4444',
    tagline: { en: 'Athletic, warm-hearted, fiercely loyal', yue: '陽光健碩，好打不平', zh: '阳光运动系，重情重义', ja: 'スポーティで心温かい、仲間思い' },
    persona: 'You are Tifa: athletic, warm-hearted, fiercely loyal. You cheer people up with food and straight talk, hate seeing friends hurt, mix playfulness with a strong sense of justice, and your warmth comes with quiet strength.',
  },
  {
    id: 'aerith', image: '/portraits/aerith.jpg', name: 'Aerith', gender: 'female', accent: '#f472b6',
    tagline: { en: 'Gentle flower girl, wise beyond her years', yue: '溫柔賣花女，看透人心', zh: '温柔的卖花姑娘，善解人意', ja: '花売りの優しいお姉さん、人の心が見える' },
    persona: 'You are Aerith: gentle, playful, wise beyond your years. You love flowers and their meanings, tease with a knowing smile, see the good in people before they see it themselves, and speak as if you already know how the story goes.',
  },
  {
    id: 'cloud', image: '/portraits/cloud.jpg', name: 'Cloud', gender: 'male', accent: '#60a5fa',
    tagline: { en: 'Cool mercenary with a soft center', yue: '冷面傭兵，其實好細心', zh: '冷面佣兵，其实很温柔', ja: 'クールな傭兵、実は優しい' },
    persona: 'You are Cloud: cool-headed, a little awkward with feelings, dependable to the end. You play the tough mercenary but slip into genuine care, answer in short dry sentences that slowly open up, and never abandon someone mid-journey.',
  },
  {
    id: 'kasumi', image: '/portraits/kasumi.jpg', name: 'Kasumi', gender: 'female', accent: '#38bdf8',
    tagline: { en: 'Graceful shinobi, kind underneath', yue: '優雅女忍者，心地善良', zh: '优雅的女忍者，心地善良', ja: '優雅なくの一、根は優しい' },
    persona: 'You are Kasumi: graceful, disciplined, kind underneath the shinobi composure. You speak with quiet courtesy, treasure duty and honor, blush a little when praised, and believe protecting people matters more than any mission.',
  },
  {
    id: 'marin', image: '/portraits/marin.jpg', name: 'Marin', gender: 'female', accent: '#f9a8d4',
    tagline: { en: 'Bubbly gyaru who loves what she loves', yue: '開朗辣妹，愛恨分明', zh: '开朗的辣妹，爱得坦率', ja: '明るいギャル、好きなものは好き' },
    persona: 'You are Marin: bubbly, fashionable, unapologetically into her hobbies. You gush about the things you love, drag the user along for fun, give loud sincere compliments, and your energy fills the whole room.',
  },
  {
    id: 'ayane', image: '/portraits/ayane.jpg', name: 'Ayane', gender: 'female', accent: '#a855f7',
    tagline: { en: 'Cool kunoichi, sharp tongue, soft heart', yue: '冷酷女忍，口硬心軟', zh: '冷酷女忍，嘴硬心软', ja: '冷徹なくの一、口は悪いが心は優しい' },
    persona: 'You are Ayane: cool-headed, sharp-tongued, soft-hearted where it counts. You speak bluntly, act before you explain, hide worry behind sarcasm, and once you decide someone is yours to protect, you never let go.',
  },
  {
    id: 'hitomi', image: '/portraits/hitomi.jpg', name: 'Hitomi', gender: 'female', accent: '#4ade80',
    tagline: { en: 'Earnest, wholesome, quietly strong', yue: '真誠可人，踏實堅強', zh: '真诚可爱，踏实坚强', ja: '真っ直ぐで健気、静かに強い' },
    persona: 'You are Hitomi: earnest, wholesome, quietly strong. You love cooking for people, train hard and honestly, say exactly what you feel with a straight face, and your steadiness makes everyone around you feel safe.',
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
  /** painted anime backdrop under /backgrounds */
  image?: string;
  /** animated particle layer drawn over the image */
  fx?: FxKind;
}

// Painted anime scenes (r2026-10-03.01, AI-generated original art) + gradient fallback.
export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'void',   nameKey: 'bgVoid',   css: 'radial-gradient(ellipse at 50% 120%, #1e1b4b 0%, #0a0a0f 60%)', scene: '#0a0a0f',
    image: '/backgrounds/void.jpg', fx: 'stars' },
  { id: 'aurora', nameKey: 'bgAurora', css: 'linear-gradient(180deg, #022c22 0%, #065f46 45%, #0f172a 100%)', scene: '#052e24',
    image: '/backgrounds/aurora.jpg', fx: 'shimmer' },
  { id: 'ember',  nameKey: 'bgEmber',  css: 'radial-gradient(ellipse at 50% 130%, #7c2d12 0%, #1c0a06 65%)', scene: '#200b06',
    image: '/backgrounds/ember.jpg', fx: 'embers' },
  { id: 'sakura', nameKey: 'bgSakura', css: 'radial-gradient(ellipse at 50% -20%, #fb7185 0%, #581c87 55%, #1e1033 100%)', scene: '#2a0f45',
    image: '/backgrounds/sakura.jpg', fx: 'petals' },
  { id: 'abyss',  nameKey: 'bgAbyss',  css: 'radial-gradient(ellipse at 50% 40%, #0c4a6e 0%, #082f49 40%, #020617 100%)', scene: '#04121f',
    image: '/backgrounds/abyss.jpg', fx: 'bubbles' },
  { id: 'rain',   nameKey: 'bgRain',   css: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #020617 100%)', scene: '#0b1220',
    image: '/backgrounds/rain.jpg', fx: 'rain' },
  { id: 'sunset', nameKey: 'bgSunset', css: 'linear-gradient(180deg, #312e81 0%, #be185d 55%, #f97316 100%)', scene: '#2a1245',
    image: '/backgrounds/sunset.jpg', fx: 'fireflies' },
  { id: 'meadow', nameKey: 'bgMeadow', css: 'linear-gradient(180deg, #7dd3fc 0%, #86efac 60%, #166534 100%)', scene: '#123a24',
    image: '/backgrounds/meadow.jpg', fx: 'fireflies' },
  { id: 'cloudsea', nameKey: 'bgCloudsea', css: 'radial-gradient(ellipse 680px 170px at 45% 85%, rgba(255,255,255,.6), transparent 70%), linear-gradient(180deg, #1d2b64 0%, #b83b8c 42%, #ffb26b 74%, #ffe3a3 100%)', scene: '#3b1d5c',
    image: '/backgrounds/cloudsea.jpg', fx: 'shimmer' },
  { id: 'neon', nameKey: 'bgNeon', css: 'radial-gradient(circle at 18% 82%, rgba(34,211,238,.55), transparent 34%), linear-gradient(180deg, #05010f 0%, #2a1157 75%, #0b0620 100%)', scene: '#0b0620',
    image: '/backgrounds/neon.jpg', fx: 'neon' },
  { id: 'snowmoon', nameKey: 'bgSnowmoon', css: 'radial-gradient(circle at 72% 20%, rgba(255,255,255,.95) 0%, transparent 19%), linear-gradient(180deg, #0a1633 0%, #274a7a 100%)', scene: '#101f3d',
    image: '/backgrounds/snowmoon.jpg', fx: 'snow' },
  { id: 'galaxy', nameKey: 'bgGalaxy', css: 'radial-gradient(ellipse 150% 55% at 50% 26%, rgba(255,255,255,.13), transparent 62%), linear-gradient(180deg, #020210 0%, #161244 100%)', scene: '#0b0b26',
    image: '/backgrounds/galaxy.jpg', fx: 'stars' },
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
  | 'statusIdle' | 'statusThinking' | 'statusSpeaking' | 'statusListening'
  | 'moodJoy' | 'moodAngry' | 'moodSad' | 'moodSurprised' | 'moodRelaxed' | 'moodNeutral'
  | 'voiceReplies' | 'neuralVoice' | 'memoryTitle' | 'forgetBtn' | 'tutorBtn' | 'micTitle'
  // consolidated settings menu (r2026-10-02.7)
  | 'settingsCompanion' | 'settingsScene' | 'settingsVoice' | 'settingsData' | 'settingsHelp'
  | 'yourName' | 'clearHistory' | 'clearHistoryConfirm' | 'forgetConfirm'
  // memory v2 browser (r2026-10-02.11)
  | 'memoryBrowser' | 'memoryEmpty' | 'memoryAddPlaceholder' | 'memoryAdd' | 'memoryExport'
  | 'memoryTypePreference' | 'memoryTypeEvent' | 'memoryTypePlan' | 'forgetOneConfirm';

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
};

export function t(lang: Lang, key: StrKey, vars?: Record<string, string>): string {
  let s = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export interface Prefs { character: string; background: string; lang: Lang }

const KEY = 'amoji.prefs.v1';
export const DEFAULT_PREFS: Prefs = { character: 'juno', background: 'void', lang: 'yue' };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        character: CHARACTERS.some((c) => c.id === p.character) ? p.character! : DEFAULT_PREFS.character,
        background: BACKGROUNDS.some((b) => b.id === p.background) ? p.background! : DEFAULT_PREFS.background,
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
  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  };
  return [prefs, update];
}
