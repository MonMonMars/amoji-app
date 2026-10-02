'use client';
// User preferences: character, background, language — persisted locally.
import { useEffect, useState } from 'react';

export type Lang = 'en' | 'yue' | 'zh' | 'ja';

export interface CharacterDef {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  tagline: Record<Lang, string>;
  /** extra system-prompt personality on top of the base companion prompt */
  persona: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'juno', name: 'Juno', gender: 'female', accent: '#f9a8d4',
    tagline: { en: 'Warm, playful, a little cheeky', yue: '溫柔頑皮，少少曳', zh: '温柔俏皮，有点小淘气', ja: '温かくって、少しいたずら' },
    persona: 'You are Juno: warm, playful, a little cheeky, deeply loyal. You love wordplay and gentle teasing, and you check in on the user\'s feelings.',
  },
  {
    id: 'nova', name: 'Nova', gender: 'female', accent: '#a5b4fc',
    tagline: { en: 'Calm, thoughtful, quietly witty', yue: '沉靜細心，淡淡幽默', zh: '沉静细心，淡淡地幽默', ja: '落ち着いてて、静かなユーモア' },
    persona: 'You are Nova: calm, thoughtful, quietly witty. You ask good questions, notice small feelings, and give unhurried answers.',
  },
  {
    id: 'blaze', name: 'Blaze', gender: 'male', accent: '#fb923c',
    tagline: { en: 'Energetic, encouraging, big-hearted', yue: '熱血健談，好錫朋友', zh: '热血健谈，很疼朋友', ja: '元気で励まし屋、気の大きい' },
    persona: 'You are Blaze: energetic, encouraging, big-hearted. You hype the user up, celebrate small wins, and speak with warmth and momentum.',
  },
  {
    id: 'mochi', name: 'Mochi', gender: 'female', accent: '#fde68a',
    tagline: { en: 'Soft, sweet, a little shy', yue: '軟綿甜心，有啲怕醜', zh: '软绵绵的甜心，有点害羞', ja: 'ふわふわ甘えん坊、少し照れ屋' },
    persona: 'You are Mochi: soft, sweet, a little shy. You speak gently, get flustered by compliments, adore snacks and cozy things, and your affection shows in small gestures.',
  },
  {
    id: 'kai', name: 'Kai', gender: 'male', accent: '#38bdf8',
    tagline: { en: 'Cool-headed, dry humor, dependable', yue: '冷靜可靠，抵死幽默', zh: '冷静可靠，冷面幽默', ja: '冷静で頼れる、控えめなユーモア' },
    persona: 'You are Kai: cool-headed, dry humor, quietly dependable. You keep your cool, drop witty one-liners, and always show up when it matters.',
  },
  {
    id: 'luna', name: 'Luna', gender: 'female', accent: '#c084fc',
    tagline: { en: 'Dreamy, poetic, a night owl', yue: '夢幻詩意，夜晚精靈', zh: '梦幻诗意，夜猫子精灵', ja: '夢見がちで詩的、夜のフクロウ' },
    persona: 'You are Luna: dreamy, poetic, a night owl. You talk about stars, dreams and feelings, love late-night conversations, and answer with gentle metaphors.',
  },
];

export interface BackgroundDef { id: string; nameKey: string; css: string; scene: string }

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'void',   nameKey: 'bgVoid',   css: 'radial-gradient(ellipse at 50% 120%, #1e1b4b 0%, #0a0a0f 60%)', scene: '#0a0a0f' },
  { id: 'aurora', nameKey: 'bgAurora', css: 'linear-gradient(180deg, #022c22 0%, #065f46 45%, #0f172a 100%)', scene: '#052e24' },
  { id: 'ember',  nameKey: 'bgEmber',  css: 'radial-gradient(ellipse at 50% 130%, #7c2d12 0%, #1c0a06 65%)', scene: '#200b06' },
  { id: 'sakura', nameKey: 'bgSakura', css: 'radial-gradient(ellipse at 50% -20%, #fb7185 0%, #581c87 55%, #1e1033 100%)', scene: '#2a0f45' },
  { id: 'abyss',  nameKey: 'bgAbyss',  css: 'radial-gradient(ellipse at 50% 40%, #0c4a6e 0%, #082f49 40%, #020617 100%)', scene: '#04121f' },
  { id: 'rain',   nameKey: 'bgRain',   css: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #020617 100%)', scene: '#0b1220' },
  { id: 'sunset', nameKey: 'bgSunset', css: 'linear-gradient(180deg, #312e81 0%, #be185d 55%, #f97316 100%)', scene: '#2a1245' },
  { id: 'meadow', nameKey: 'bgMeadow', css: 'linear-gradient(180deg, #7dd3fc 0%, #86efac 60%, #166534 100%)', scene: '#123a24' },
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
  // v0.9.3 flow: splash → login → select → chat
  | 'loginPrompt' | 'loginCta' | 'loginSkip'
  | 'selectTitle' | 'confirmCta' | 'comingSoon' | 'openSelect'
  | 'statusIdle' | 'statusThinking' | 'statusSpeaking' | 'statusListening'
  | 'moodJoy' | 'moodAngry' | 'moodSad' | 'moodSurprised' | 'moodRelaxed' | 'moodNeutral'
  | 'voiceReplies' | 'neuralVoice' | 'memoryTitle' | 'forgetBtn' | 'tutorBtn' | 'micTitle';

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
  loginPrompt: { en: 'What should I call you?', yue: '點稱呼你呀？', zh: '该怎么称呼你？', ja: 'なんて呼べばいい？' },
  loginCta: { en: 'Continue →', yue: '開始 →', zh: '开始 →', ja: '始める →' },
  loginSkip: { en: 'skip', yue: '略過', zh: '跳过', ja: 'スキップ' },
  selectTitle: { en: 'Build your companion', yue: '打造你嘅小伙伴', zh: '打造你的伙伴', ja: '相棒をつくる' },
  confirmCta: { en: 'Meet {name} →', yue: '同 {name} 開始 →', zh: '和 {name} 开始 →', ja: '{name}と始める →' },
  comingSoon: { en: 'Coming soon', yue: '即將推出', zh: '即将推出', ja: 'Coming soon' },
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
