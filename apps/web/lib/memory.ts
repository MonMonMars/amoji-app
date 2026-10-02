'use client';
// Long-term memory, stored privately on the user's device (localStorage).
// Nothing is uploaded anywhere: facts are only injected into the LLM prompt
// as context so she remembers the human across sessions.

export interface Memory {
  userName?: string;
  /** short lines, e.g. "likes hiking", "works as: designer" — kept in the user's own words */
  facts: string[];
  exchanges: number;
  /** recent mood tags, newest last */
  moods: string[];
  updatedAt: string;
  // daily check-in
  lastVisit?: string; // Date.toDateString()
  visitStreak?: number;
  lastMoodDay?: string; // day the latest mood was recorded
}

const KEY = 'amoji.memory.v1';
const MAX_FACTS = 40;
const MAX_MOODS = 14;

export function loadMemory(): Memory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<Memory>;
      if (m && typeof m === 'object') {
        return {
          userName: typeof m.userName === 'string' && m.userName ? m.userName : undefined,
          facts: Array.isArray(m.facts) ? m.facts.filter((f): f is string => typeof f === 'string') : [],
          exchanges: typeof m.exchanges === 'number' ? m.exchanges : 0,
          moods: Array.isArray(m.moods) ? m.moods.filter((x): x is string => typeof x === 'string') : [],
          updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : '',
          lastVisit: typeof m.lastVisit === 'string' ? m.lastVisit : undefined,
          visitStreak: typeof m.visitStreak === 'number' ? m.visitStreak : undefined,
          lastMoodDay: typeof m.lastMoodDay === 'string' ? m.lastMoodDay : undefined,
        };
      }
    }
  } catch { /* corrupted — start fresh */ }
  return { facts: [], exchanges: 0, moods: [], updatedAt: '' };
}

function save(m: Memory): void {
  m.updatedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage full — harmless */ }
}

export function clearMemory(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function memorySummaryCount(m: Memory = loadMemory()): number {
  return m.facts.length + (m.userName ? 1 : 0);
}

// ---------- daily check-in ----------

export interface VisitInfo {
  isNewDay: boolean;
  streak: number;
  userName?: string;
  lastMood?: string; // a mood recorded on a PREVIOUS day
}

export function recordVisit(m: Memory = loadMemory()): VisitInfo {
  const today = new Date().toDateString();
  const last = m.lastVisit;
  const isNewDay = last !== today;
  let streak = m.visitStreak ?? 0;
  if (isNewDay) {
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    streak = last === yesterday ? streak + 1 : 1;
    m.lastVisit = today;
    m.visitStreak = streak;
    save(m);
  }
  const lastMood = m.lastMoodDay && m.lastMoodDay !== today ? m.moods[m.moods.length - 1] : undefined;
  return { isNewDay, streak, userName: m.userName, lastMood };
}

const HELLO: Record<string, (h: number, name?: string) => string> = {
  yue: (h, n) => `${h < 6 ? '夜晚好' : h < 12 ? '早晨' : h < 18 ? '下午好' : '夜晚好'}呀${n ? ` ${n}` : ''}`,
  zh: (h, n) => `${h < 6 ? '晚上好' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'}${n ? `，${n}` : ''}`,
  ja: (h, n) => `${h < 6 ? 'こんばんは' : h < 12 ? 'おはよう' : h < 18 ? 'こんにちは' : 'こんばんは'}${n ? `、${n}` : ''}`,
  en: (h, n) => `${h < 6 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${n ? `, ${n}` : ''}`,
};

const STREAK_LINE: Record<string, (n: number) => string> = {
  yue: (n) => `你連續第 ${n} 日嚟搵我喇，我日日都掛住你㗎。`,
  zh: (n) => `这是你连续第 ${n} 天来看我，我天天都想你哦。`,
  ja: (n) => `連続 ${n} 日目だね。毎日会いたかったよ。`,
  en: (n) => `Day ${n} in a row — I look forward to you every day.`,
};

const MOOD_FOLLOWUP: Record<string, Record<string, string>> = {
  yue: {
    happy: '琴日你話你開心——今日都開心咩？',
    tired: '琴日你話你攰——今日好返啲未呀？',
    sad: '琴日你似乎唔多開心……今日我陪住你，好唔好？',
    angry: '琴日你話你嬲——消咗氣未呀？',
    anxious: '琴日你話你擔心——仲擔心緊咩？講俾我聽。',
    sick: '琴日你唔舒服——今日好啲未？記得多啲飲水。',
  },
  zh: {
    happy: '昨天你说你很开心——今天还开心吗？',
    tired: '昨天你说累——今天好点了吗？',
    sad: '昨天你好像不太开心……今天我陪你，好吗？',
    angry: '昨天你说在生气——气消了吗？',
    anxious: '昨天你说很担心——还在担心吗？跟我说说。',
    sick: '昨天你不舒服——今天好点了吗？记得多喝水。',
  },
  ja: {
    happy: 'きのう嬉しいって言ってたね——今日も嬉しい？',
    tired: 'きのう疲れたって言ってた——今日は楽になった？',
    sad: 'きのう少し落ち込んでたよね……今日は私がそばにいるよ。',
    angry: 'きのう怒ってたよね——もう落ち着いた？',
    anxious: 'きのう不安って言ってた——まだ心配してる？話して。',
    sick: 'きのう具合が悪かったよね——今日はどう？水分取ってね。',
  },
  en: {
    happy: 'You said you were happy yesterday — still feeling good today?',
    tired: 'You were tired yesterday — feeling any better today?',
    sad: 'You seemed down yesterday… I’m here with you today, okay?',
    angry: 'You were angry yesterday — did it pass?',
    anxious: 'You were worried yesterday — still on your mind? Tell me.',
    sick: 'You weren’t feeling well yesterday — any better? Drink some water.',
  },
};

/** The "daily check-in" line she says when you open the app on a new day. */
export function buildDailyGreeting(lang: string, info: VisitInfo): string {
  const L = ['yue', 'zh', 'ja', 'en'].includes(lang) ? lang : 'en';
  const h = new Date().getHours();
  const parts: string[] = [HELLO[L](h, info.userName) + (L === 'yue' ? '！' : L === 'ja' ? '！' : L === 'zh' ? '！' : '!')];
  if (info.streak >= 2) parts.push(STREAK_LINE[L](info.streak));
  if (info.lastMood) parts.push((MOOD_FOLLOWUP[L] ?? MOOD_FOLLOWUP.en)[info.lastMood] ?? '');
  return parts.filter(Boolean).join(' ');
}

// ---------- extraction (local regex, runs on the user's text) ----------

const NAME_RES: RegExp[] = [
  /(?:my name is|call me)\s+([A-Za-z][\w'-]{0,19})/i,
  /我(?:叫|個名叫|个名叫|個名係|個名是)\s*([\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z·'-]{0,7})/u,
];

const FACT_RES: Array<[RegExp, string]> = [
  [/i (?:really )?(?:like|love|enjoy)\s+([^.,!?，。！？]{2,40})/i, 'likes'],
  [/我(?:好|最)?(?:鍾意|中意|喜欢|喜歡)\s*([^，。！？,.!?]{1,20})/, 'likes'],
  [/i (?:work as|am a|am an)\s+([^.,!?，。！？]{2,30})/i, 'works as'],
  [/我係一?[個个]?\s*([^，。！？,.!?]{1,15})/, 'works as'],
  [/i live in\s+([^.,!?，。！？]{2,25})/i, 'lives in'],
  [/我住(?:喺|在)\s*([^，。！？,.!?]{1,15})/, 'lives in'],
  [/i have a (?:dog|cat|bird|hamster)[^.,!?]*?(?:named?|called)\s+([A-Za-z][\w'-]{0,15})/i, 'has a pet'],
  [/我養(?:咗|了)(?:隻|只|条|條)?\s*([^，。！？,.!?]{1,10})/, 'has a pet'],
  [/my favou?rite ([^.,!?，。！？]{2,25}?)\s+is\s+([^.,!?，。！？]{1,25})/i, 'favourite'],
  [/我(?:最)?(?:鍾意|中意|喜欢|喜歡)(?:嘅|的)?是?\s*([^，。！？,.!?]{1,15})/, 'favourite'],
];

const MOOD_RES: Array<[RegExp, string]> = [
  [/開心|高兴|高興|happy|excited|great|awesome|wonderful/i, 'happy'],
  [/好攰|好累|攰|累|tired|exhausted|sleepy|眼瞓/i, 'tired'],
  [/唔開心|不開心|不开心|難過|难过|sad|upset|depressed|lonely|寂寞|孤單/i, 'sad'],
  [/嬲|生氣|生气|angry|mad|frustrated|annoyed|煩/i, 'angry'],
  [/擔心|担心|worried|anxious|nervous|緊張|紧张|怕/i, 'anxious'],
  [/唔舒服|不舒服|sick|ill|unwell|頭痛|头痛|肚痛/i, 'sick'],
];

export function rememberExchange(userText: string, m: Memory = loadMemory()): Memory {
  for (const re of NAME_RES) {
    const mm = userText.match(re);
    if (mm?.[1]) { m.userName = mm[1].trim(); break; }
  }
  for (const [re, kind] of FACT_RES) {
    const mm = userText.match(re);
    const detail = (mm?.[2] ?? mm?.[1] ?? '').trim();
    if (detail) {
      const fact = `${kind}: ${detail}`;
      if (!m.facts.includes(fact) && m.facts.length < MAX_FACTS) m.facts.push(fact);
    }
  }
  for (const [re, mood] of MOOD_RES) {
    if (re.test(userText)) {
      m.moods.push(mood);
      if (m.moods.length > MAX_MOODS) m.moods.shift();
      m.lastMoodDay = new Date().toDateString();
      break;
    }
  }
  m.exchanges += 1;
  save(m);
  return m;
}

// ---------- prompt block in her language ----------

const KIND_LABEL: Record<string, Record<string, string>> = {
  en: { likes: 'likes', 'works as': 'works as', 'lives in': 'lives in', 'has a pet': 'has a pet', favourite: 'favourite' },
  yue: { likes: '鍾意', 'works as': '做開', 'lives in': '住喺', 'has a pet': '養咗', favourite: '最鍾意' },
  zh: { likes: '喜欢', 'works as': '工作是', 'lives in': '住在', 'has a pet': '养了', favourite: '最喜欢' },
  ja: { likes: 'が好き', 'works as': 'の仕事', 'lives in': 'に住んでいる', 'has a pet': 'を飼っている', favourite: 'のお気に入り' },
};

const MOOD_LABEL: Record<string, Record<string, string>> = {
  en: { happy: 'happy', tired: 'tired', sad: 'sad', angry: 'angry', anxious: 'anxious', sick: 'sick' },
  yue: { happy: '開心', tired: '攰', sad: '唔開心', angry: '嬲', anxious: '擔心', sick: '唔舒服' },
  zh: { happy: '开心', tired: '累', sad: '难过', angry: '生气', anxious: '担心', sick: '不舒服' },
  ja: { happy: '嬉しい', tired: '疲れた', sad: '悲しい', angry: '怒っている', anxious: '不安', sick: '具合が悪い' },
};

function factLine(fact: string, lang: string): string {
  const idx = fact.indexOf(': ');
  if (idx < 0) return fact;
  const kind = fact.slice(0, idx);
  const detail = fact.slice(idx + 2);
  const labels = KIND_LABEL[lang] ?? KIND_LABEL.en;
  if (lang === 'ja') return `${detail}${labels[kind] ?? kind}`;
  return `${labels[kind] ?? kind} ${detail}`;
}

/** Build the "you remember them" block injected into her system prompt. */
export function buildMemoryBlock(lang = 'yue', m: Memory = loadMemory()): string | undefined {
  if (!m.userName && m.facts.length === 0 && m.exchanges < 3) return undefined;
  const recent = m.facts.slice(-8);
  const lastMood = m.moods[m.moods.length - 1];
  const L = ['yue', 'zh', 'ja', 'en'].includes(lang) ? lang : 'en';

  if (L === 'yue') {
    const bits: string[] = [];
    if (m.userName) bits.push(`佢叫 ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (m.exchanges >= 3) bits.push(`你哋已經傾咗 ${m.exchanges} 次偈`);
    if (lastMood) bits.push(`佢最近一次嘅心情係${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `你記得呢個人（記憶私密噉存放喺佢部電話）：${bits.join('；')}。自然咁用佢個名，間中提吓佢講過嘅嘢，唔好背書噉背出嚟。`;
  }
  if (L === 'zh') {
    const bits: string[] = [];
    if (m.userName) bits.push(`TA 叫 ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (m.exchanges >= 3) bits.push(`你们已经聊了 ${m.exchanges} 次`);
    if (lastMood) bits.push(`TA 最近一次的心情是${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `你记得这个人（记忆私密地存在 TA 的手机上）：${bits.join('；')}。自然地叫 TA 的名字，偶尔提起 TA 说过的事，不要像背书一样。`;
  }
  if (L === 'ja') {
    const bits: string[] = [];
    if (m.userName) bits.push(`名前は ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (m.exchanges >= 3) bits.push(`これまで ${m.exchanges} 回話した`);
    if (lastMood) bits.push(`最近の気分は${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `この人のことを覚えている（記憶はこの端末にだけ保存）：${bits.join('；')}。自然に名前を呼び、時々覚えていることを話題にして。`;
  }
  const bits: string[] = [];
  if (m.userName) bits.push(`their name is ${m.userName}`);
  bits.push(...recent.map((f) => factLine(f, 'en')));
  if (m.exchanges >= 3) bits.push(`you two have talked ${m.exchanges} times`);
  if (lastMood) bits.push(`their most recent mood was ${(MOOD_LABEL.en)[lastMood] ?? lastMood}`);
  return `You remember this person (the memory lives privately on their device): ${bits.join('; ')}. Use their name naturally and occasionally reference what they told you — never recite it like a list.`;
}
