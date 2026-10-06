'use client';
// Long-term memory, stored privately on the user's device (localStorage).
// Nothing is uploaded anywhere: what she remembers is only injected into the
// LLM prompt as context so she recognises the human across sessions.
//
// v2 (r2026-10-02.11): typed memory entries — preferences, moments, and
// upcoming plans with approximate due days — a browser/editor in settings,
// and a plan-aware daily check-in greeting.
//
// v3 (r2026-10-03.14): emotion diary — one mood-tagged line per exchange,
// so she recalls how your recent days FELT, not just what was said. Recalled
// across sessions ("this day last week…") and browsable in settings.
//
// v3.1 (r2026-10-03.17): recalled mood → expression — when the daily check-in
// quotes an emotional memory, her face, the mic orb AND her voice wear that
// feeling while she says it (moodToHints / greetingHints).
//
// v3.2 (r2026-10-03.18): felt-mood reaction — how the user feels mid-chat is
// detected instantly (detectMood) and worn by her face, mic orb and voice as
// a floor under whatever her reply later adds. (.18b: negative moods are
// matched BEFORE happy — 「唔開心/不開心」 contain 「開心」, so order is the
// fix, not lookbehind, because tsconfig targets ES2017.)
//
// v3.3 (r2026-10-03.19): Japanese felt-mood phrases — 嬉しい/疲れた/寂しい/
// 怒ってる/不安/具合が悪い… so she reacts instantly in ja too, not just
// yue/zh/en.
//
// v3.4 (r2026-10-03.20): felt-mood INTENSITY — amplifiers (超開心 / 勁攰 /
// very tired / とても嬉しい) scale how strongly she wears the feeling;
// plain moods stay gentle. moodToHints(mood, intensity) clamps at 1.
//
// v3.5 (r2026-10-03.22): the diary remembers INTENSITY — 超開心 is stored as
// happy × 1.5, so tomorrow's check-in asks about it with matching weight
// ("you were SO happy…") and her face wears it harder while she says it.
//
// v4 (r2026-10-03.30): conversation-thread memory — the last thing you two
// were discussing is stored with her reply, so on a NEW day she picks the
// thread back up ("last time we were talking about…") and the memory block
// in her prompt always carries the open topic.
//
// v5 (r2026-10-06.125): RELATIONSHIP TIMELINE + TOPIC-RELEVANT RECALL.
// She now knows how many days you two have been together (firstMet is
// stamped on the first visit) and celebrates milestones (day 1/3/7/14/30/…
// each fires exactly once, in the daily check-in). And the memory block no
// longer shows only the newest facts: when the user's message mentions
// something she has an OLD memory about (hiking, the cat, the interview),
// recallRelevant() surfaces those older entries into the prompt by
// token-overlap scoring — she connects today's words to things told to her
// weeks ago, like a real partner would. Facts/plans/diary already
// persisted; what was missing was the running conversation itself.
//
// v6 (r2026-10-06.130): IMPORTANT ANNUAL DATES + HER PROMISES.
// Birthday-type dates ("my birthday is July 5" / 我生日係7月5號 / 誕生日は7月5日)
// are extracted into a recurring annual memory — she celebrates it in the
// daily check-in, exactly once per year, instead of letting it scroll out
// of the capped entry list. And commitments SHE makes in her own replies
// ("I'll remind you tomorrow" / 我會提醒你 / 明日ね) are remembered too, so
// her prompt carries what she promised — she keeps her word like a partner,
// not a stateless chatbot.

export type MemoryType = 'preference' | 'event' | 'plan';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  /** the user's own words, trimmed */
  text: string;
  /** day recorded (Date.toDateString()); '' for legacy-seeded entries */
  day: string;
  /** plans only: approximate day the thing happens */
  dueDay?: string;
}

export interface DiaryEntry {
  id: string;
  /** day of the exchange (Date.toDateString()) */
  day: string;
  /** the user's words, trimmed to one short line */
  text: string;
  /** mood detected during this exchange, if any */
  mood?: string;
  /** v3.5: how strongly it was felt (1 plain, 1.5 amplified) */
  intensity?: number;
  /** which conversation exchange this line came from */
  exchangeNo: number;
}

/** v4: the last exchange of the previous conversation — what you two were
 *  talking about when you last left off, so she can pick the thread back up. */
export interface ThreadLine {
  /** day of the exchange (Date.toDateString()) */
  day: string;
  /** the user's last words of that conversation, one short line */
  user: string;
  /** her reply to it, one short line */
  reply: string;
}

/** v6: an annual date that matters to the human (birthday, anniversary…).
 *  Recurs every year — fires in the daily check-in exactly once per year. */
export interface ImportantDate {
  id: string;
  /** what the occasion is, in the user's own words ("birthday", "生日") */
  label: string;
  month: number; // 1–12
  day: number;   // 1–31
  /** year the celebration last fired — prevents double-firing within a year */
  lastFiredYear?: number;
}

/** v6: something SHE promised in her own reply — kept in the prompt so she
 *  remembers her own word, not only what the human told her. */
export interface HerPromise {
  id: string;
  /** her commitment, one short line */
  text: string;
  /** day she said it (Date.toDateString()) */
  day: string;
}

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
  /** v3.5: intensity of the latest mood (1 plain, 1.5 amplified) */
  lastMoodIntensity?: number;
  /** v2 typed memories, newest last */
  entries: MemoryEntry[];
  /** v3 emotion diary, newest last — one mood-tagged line per exchange */
  diary?: DiaryEntry[];
  /** v4 conversation thread — the last exchange you two had */
  lastThread?: ThreadLine;
  /** v5: the day you two first met (Date.toDateString()) */
  firstMet?: string;
  /** v5: relationship-day count of the last celebrated milestone */
  lastMilestone?: number;
  /** v6: annual dates (birthday, anniversary…) — celebrated once per year */
  importantDates?: ImportantDate[];
  /** v6: commitments she made in her own replies, newest last */
  promises?: HerPromise[];
}

const KEY = 'amoji.memory.v2';
const LEGACY_KEY = 'amoji.memory.v1';
const MAX_FACTS = 40;
const MAX_MOODS = 14;
const MAX_ENTRIES = 60;
const MAX_DIARY = 30;
const MAX_DATES = 10;
const MAX_PROMISES = 8;

function todayStr(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toDateString();
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `e${Date.now().toString(36)}-${idCounter}`;
}

function isMemoryType(x: unknown): x is MemoryType {
  return x === 'preference' || x === 'event' || x === 'plan';
}

function coerce(parsed: unknown): Memory | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const m = parsed as Partial<Memory>;
  const lt = m.lastThread as Partial<ThreadLine> | undefined;
  const memory: Memory = {
    userName: typeof m.userName === 'string' && m.userName ? m.userName : undefined,
    facts: Array.isArray(m.facts) ? m.facts.filter((f): f is string => typeof f === 'string') : [],
    exchanges: typeof m.exchanges === 'number' ? m.exchanges : 0,
    moods: Array.isArray(m.moods) ? m.moods.filter((x): x is string => typeof x === 'string') : [],
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : '',
    lastVisit: typeof m.lastVisit === 'string' ? m.lastVisit : undefined,
    visitStreak: typeof m.visitStreak === 'number' ? m.visitStreak : undefined,
    lastMoodDay: typeof m.lastMoodDay === 'string' ? m.lastMoodDay : undefined,
    lastMoodIntensity: typeof m.lastMoodIntensity === 'number' ? m.lastMoodIntensity : undefined,
    entries: [],
    diary: [],
    lastThread: lt && typeof lt.day === 'string' && typeof lt.user === 'string' && typeof lt.reply === 'string'
      ? { day: lt.day, user: lt.user, reply: lt.reply }
      : undefined,
    firstMet: typeof m.firstMet === 'string' && m.firstMet ? m.firstMet : undefined,
    lastMilestone: typeof m.lastMilestone === 'number' ? m.lastMilestone : undefined,
  };
  if (Array.isArray(m.importantDates)) {
    memory.importantDates = m.importantDates.filter(
      (d): d is ImportantDate =>
        !!d && typeof d === 'object' && typeof d.id === 'string' &&
        typeof d.label === 'string' &&
        typeof d.month === 'number' && d.month >= 1 && d.month <= 12 &&
        typeof d.day === 'number' && d.day >= 1 && d.day <= 31,
    );
  }
  if (Array.isArray(m.promises)) {
    memory.promises = m.promises.filter(
      (p): p is HerPromise =>
        !!p && typeof p === 'object' && typeof p.id === 'string' &&
        typeof p.text === 'string' && typeof p.day === 'string',
    );
  }
  if (Array.isArray(m.entries)) {
    memory.entries = m.entries.filter(
      (e): e is MemoryEntry =>
        !!e && typeof e === 'object' && isMemoryType(e.type) &&
        typeof e.text === 'string' && typeof e.id === 'string' && typeof e.day === 'string',
    );
  } else {
    // v1 → v2 migration: seed typed entries from the flat fact lines
    memory.entries = memory.facts.map((f) => ({ id: newId(), type: 'preference', text: f, day: '' }));
  }
  if (Array.isArray(m.diary)) {
    // defensive: old stored JSON (pre-diary) simply has no array — tolerate junk
    memory.diary = m.diary.filter(
      (d): d is DiaryEntry =>
        !!d && typeof d === 'object' && typeof d.id === 'string' && typeof d.day === 'string' &&
        typeof d.text === 'string',
    );
  }
  return memory;
}

export function loadMemory(): Memory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = coerce(JSON.parse(raw));
      if (m) return m;
    }
  } catch { /* corrupted — try legacy */ }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const m = coerce(JSON.parse(raw));
      if (m) { save(m); return m; }
    }
  } catch { /* ignore */ }
  return { facts: [], exchanges: 0, moods: [], updatedAt: '', entries: [], diary: [] };
}

function save(m: Memory): void {
  m.updatedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage full — harmless */ }
}

export function clearMemory(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}

export function memorySummaryCount(m: Memory = loadMemory()): number {
  return m.facts.length + m.entries.length + (m.userName ? 1 : 0);
}

// ---------- typed entries: browser / editor API ----------

function pushEntry(m: Memory, type: MemoryType, text: string, dueOffset?: number): MemoryEntry | undefined {
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!clean) return undefined;
  if (m.entries.some((e) => e.type === type && e.text === clean)) return undefined;
  const entry: MemoryEntry = { id: newId(), type, text: clean, day: todayStr() };
  if (type === 'plan' && dueOffset) entry.dueDay = todayStr(dueOffset);
  m.entries.push(entry);
  if (m.entries.length > MAX_ENTRIES) m.entries.shift();
  return entry;
}

/** Manually teach her something (settings → memory browser). */
export function addEntry(type: MemoryType, text: string, m: Memory = loadMemory()): MemoryEntry | undefined {
  const entry = pushEntry(m, type, text);
  if (entry) save(m);
  return entry;
}

export function deleteEntry(id: string, m: Memory = loadMemory()): void {
  m.entries = m.entries.filter((e) => e.id !== id);
  save(m);
}

export function editEntry(id: string, text: string, m: Memory = loadMemory()): void {
  const e = m.entries.find((x) => x.id === id);
  const clean = text.trim().slice(0, 120);
  if (e && clean) { e.text = clean; save(m); }
}

// ---------- conversation thread (v4, r2026-10-03.30) ----------

/**
 * The running conversation itself: the last thing the user said and what she
 * answered, one short line each. Written after every completed turn so that
 * a new session can pick the thread back up instead of starting cold. The
 * user line doubles as the "open topic" carried inside her prompt.
 * v6: her reply is also scanned for commitments — promises SHE makes are
 * remembered so her own word rides into future prompts.
 */
export function rememberTurn(userText: string, reply: string, m: Memory = loadMemory()): void {
  const u = userText.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!u) return;
  const r = reply.trim().replace(/\s+/g, ' ').slice(0, 60);
  m.lastThread = { day: todayStr(), user: u, reply: r };
  pushPromise(m, reply);
  save(m);
}

// ---------- her promises (v6, r2026-10-06.130) ----------

// Commitments phrased in HER voice — first person, future intent. Kept
// deliberately conservative: only clear "I will / I promise" shapes, so
// ordinary replies don't flood the list.
const PROMISE_RES: RegExp[] = [
  /我會(?:提醒你|記住|記得|幫你|一直|永遠)|我应承|我答應你|我一定會/,
  /I'll remind you|I promise|I won't forget|I'll remember(?: to)?|let me remember/i,
  /明日(?:ね)?[、，]?(?:覚えておく|確認する|リマインド)|約束するよ|覚えとくね/,
];

function pushPromise(m: Memory, herReply: string): void {
  const hit = PROMISE_RES.some((re) => re.test(herReply));
  if (!hit) return;
  const clean = herReply.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!clean) return;
  if (m.promises?.some((p) => p.text === clean)) return;
  if (!m.promises) m.promises = [];
  m.promises.push({ id: newId(), text: clean, day: todayStr() });
  if (m.promises.length > MAX_PROMISES) m.promises.shift();
}

/** Remove one promise (settings → promises browser). */
export function deletePromise(id: string, m: Memory = loadMemory()): void {
  if (!m.promises) return;
  m.promises = m.promises.filter((p) => p.id !== id);
  save(m);
}

// ---------- important annual dates (v6, r2026-10-06.130) ----------

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** [regex, labelGroup, monthGroup, dayGroup] — label kept in the user's words */
const DATE_RES: Array<[RegExp, number, number, number]> = [
  [/my (birthday|anniversary)(?: is)?(?: on)? ([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i, 1, 2, 3],
  [/我(?:嘅|的)?(生日|結婚紀念日|周年紀念)(?:係|是|在)?\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号|號)?/, 1, 2, 3],
  [/我(?:嘅|的)?(生日|結婚紀念日|周年紀念)(?:係|是|在)?\s*(\d{1,2})\s*\/\s*(\d{1,2})/, 1, 2, 3],
  [/(誕生日|記念日|結婚記念日)は\s*(\d{1,2})月\s*(\d{1,2})日/, 1, 2, 3],
];

function pushImportantDate(m: Memory, label: string, month: number, day: number): void {
  if (month < 1 || month > 12 || day < 1 || day > 31) return;
  if (m.importantDates?.some((d) => d.label === label && d.month === month && d.day === day)) return;
  if (!m.importantDates) m.importantDates = [];
  m.importantDates.push({ id: newId(), label, month, day });
  if (m.importantDates.length > MAX_DATES) m.importantDates.shift();
}

/** Remove one important date (settings → dates browser). */
export function deleteImportantDate(id: string, m: Memory = loadMemory()): void {
  if (!m.importantDates) return;
  m.importantDates = m.importantDates.filter((d) => d.id !== id);
  save(m);
}

/** The annual date firing TODAY, if any (pure — firing/mark happens in recordVisit). */
export function anniversaryToday(m: Memory = loadMemory()): ImportantDate | undefined {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return m.importantDates?.find((d) => d.month === month && d.day === day && d.lastFiredYear !== now.getFullYear());
}

// ---------- emotion diary (v3) ----------

/**
 * She keeps a private diary: one short mood-tagged line per exchange, so she
 * can recall how your recent days FELT, not just what was said. Written inside
 * rememberExchange; capped, drop-oldest, same-day exact duplicates skipped.
 * v3.5: mood lines also carry the felt INTENSITY (1 plain, 1.5 amplified).
 */
function pushDiary(m: Memory, userText: string, mood?: string, intensity = 1): void {
  const clean = userText.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!clean) return;
  if (!m.diary) m.diary = [];
  const last = m.diary[m.diary.length - 1];
  if (last && last.day === todayStr() && last.text === clean) return;
  m.diary.push({ id: newId(), day: todayStr(), text: clean, mood, intensity: mood ? intensity : undefined, exchangeNo: m.exchanges });
  if (m.diary.length > MAX_DIARY) m.diary.shift();
}

/** Remove one diary line (settings → diary browser). */
export function deleteDiaryEntry(id: string, m: Memory = loadMemory()): void {
  if (!m.diary) return;
  m.diary = m.diary.filter((d) => d.id !== id);
  save(m);
}

/** One line per recent day — "Oct 01 [happy/tired] — went hiking with the dog".
 *  v3.5: an amplified mood shows as happy! — the ! is the intensity marker. */
export function diarySummary(m: Memory = loadMemory(), maxDays = 7): string[] {
  if (!m.diary || m.diary.length === 0) return [];
  const byDay = new Map<string, DiaryEntry[]>();
  for (const d of m.diary) {
    const list = byDay.get(d.day);
    if (list) list.push(d); else byDay.set(d.day, [d]);
  }
  return [...byDay.keys()].slice(-maxDays).map((day) => {
    const entries = byDay.get(day)!;
    const last = entries[entries.length - 1]!;
    const moodTags = [...new Set(entries.map((e) => e.mood).filter((x): x is string => typeof x === 'string'))];
    const moodPart = moodTags.length
      ? ` [${moodTags.map((md) => {
          const src = [...entries].reverse().find((e) => e.mood === md);
          return src && (src.intensity ?? 1) >= 1.5 ? `${md}!` : md;
        }).join('/')}]`
      : '';
    return `${day.slice(4, 10)}${moodPart} — ${last.text}`;
  });
}

/** Everything she remembers, as readable JSON for the user's own export/copy. */
export function exportMemory(m: Memory = loadMemory()): string {
  return JSON.stringify({
    name: m.userName ?? null,
    exchanges: m.exchanges,
    visitStreak: m.visitStreak ?? 0,
    daysTogether: m.firstMet ? daysTogether(m) : 0,
    facts: m.facts,
    entries: m.entries,
    diary: m.diary ?? [],
    lastThread: m.lastThread ?? null,
    moods: m.moods,
    importantDates: m.importantDates ?? [],
    promises: m.promises ?? [],
  }, null, 2);
}

// ---------- daily check-in ----------

export interface VisitInfo {
  isNewDay: boolean;
  streak: number;
  userName?: string;
  lastMood?: string; // a mood recorded on a PREVIOUS day
  /** v3.5: how strongly that previous-day mood was felt (1 plain, 1.5 amplified) */
  lastMoodIntensity?: number;
  /** a plan whose due day is TODAY (text of the entry) */
  planToday?: string;
  /** a plan whose due day was YESTERDAY — she asks how it went */
  planMissed?: string;
  /** a diary line from exactly a week ago — she asks how it turned out */
  diaryWeekAgo?: string;
  /** the mood tag of that week-ago diary line, if it had one */
  diaryWeekAgoMood?: string;
  /** v3.5: intensity of that week-ago mood, if it had one */
  diaryWeekAgoMoodIntensity?: number;
  /** v4: the user's last words from a PREVIOUS day's conversation */
  lastThreadDay?: string;
  lastThreadUser?: string;
  lastThreadReply?: string;
  /** v5: a relationship milestone due TODAY (day count) — fired once each */
  milestone?: number;
  /** v5: how many days you two have been together */
  daysTogether?: number;
  /** v6: an annual date (birthday…) falling on TODAY, fired once per year */
  anniversaryLabel?: string;
}

export function recordVisit(m: Memory = loadMemory()): VisitInfo {
  const today = todayStr();
  const last = m.lastVisit;
  const isNewDay = last !== today;
  let streak = m.visitStreak ?? 0;
  if (isNewDay) {
    streak = last === todayStr(-1) ? streak + 1 : 1;
    m.lastVisit = today;
    m.visitStreak = streak;
    save(m);
  }
  const lastMood = m.lastMoodDay && m.lastMoodDay !== today ? m.moods[m.moods.length - 1] : undefined;
  const lastMoodIntensity = lastMood ? m.lastMoodIntensity ?? 1 : undefined;
  const planToday = m.entries.find((e) => e.type === 'plan' && e.dueDay === today)?.text;
  const planMissed = m.entries.find((e) => e.type === 'plan' && e.dueDay === todayStr(-1))?.text;
  const weekAgoLine = m.diary?.filter((d) => d.day === todayStr(-7)).pop();
  const diaryWeekAgo = weekAgoLine ? weekAgoLine.text.slice(0, 60) : undefined;
  const diaryWeekAgoMood = weekAgoLine?.mood;
  const diaryWeekAgoMoodIntensity = weekAgoLine ? weekAgoLine.intensity : undefined;
  // v4 — a thread from a previous day only; today's thread is still open,
  // she doesn't need to "pick it back up" while you're mid-conversation
  const lt = m.lastThread;
  const lastThreadDay = lt && lt.day !== today ? lt.day : undefined;
  // v5 — relationship timeline: first meeting is stamped once, and a due
  // milestone is consumed (marked celebrated) exactly once per threshold
  let milestone: number | undefined;
  if (isNewDay) {
    if (!m.firstMet) m.firstMet = today;
    const due = pendingMilestone(m);
    if (due) { m.lastMilestone = due; milestone = due; }
  }
  // v6 — an annual date falling today fires exactly once per year
  let anniversaryLabel: string | undefined;
  const anniv = anniversaryToday(m);
  if (anniv) {
    anniv.lastFiredYear = new Date().getFullYear();
    anniversaryLabel = anniv.label;
  }
  if (isNewDay || anniversaryLabel) save(m);
  return {
    isNewDay, streak, userName: m.userName,
    lastMood, lastMoodIntensity,
    planToday, planMissed,
    diaryWeekAgo, diaryWeekAgoMood, diaryWeekAgoMoodIntensity,
    lastThreadDay,
    lastThreadUser: lastThreadDay ? lt?.user : undefined,
    lastThreadReply: lastThreadDay ? lt?.reply : undefined,
    milestone,
    daysTogether: m.firstMet ? daysTogether(m) : undefined,
    anniversaryLabel,
  };
}

// ---------- relationship timeline (v5, r2026-10-06.125) ----------

/** the relationship-day counts she celebrates, each exactly once */
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 100, 200, 365, 500, 730, 1000, 1460, 1825];

/** How many days you two have been together (1 = the day you met). */
export function daysTogether(m: Memory = loadMemory()): number {
  if (!m.firstMet) return 0;
  const a = new Date(m.firstMet).getTime();
  const b = new Date(todayStr()).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** The highest milestone reached but not yet celebrated (pure — no writes). */
export function pendingMilestone(m: Memory = loadMemory()): number | undefined {
  const d = daysTogether(m);
  const done = m.lastMilestone ?? 0;
  const hits = MILESTONE_DAYS.filter((x) => x <= d && x > done);
  return hits.length ? hits[hits.length - 1] : undefined;
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

// v4: pick the previous conversation's thread back up — she remembers what
// you two were last discussing and offers to continue it.
const LAST_THREAD: Record<string, (u: string) => string> = {
  yue: (u) => `我哋上次傾開「${u}」——想唔想繼續嗰個話題？`,
  zh: (u) => `我们上次聊到「${u}」——要不要继续那个话题？`,
  ja: (u) => `前回は「${u}」の話してたね——続き、話す？`,
  en: (u) => `Last time we were talking about "${u}" — want to pick it back up?`,
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

// v3.5: the amplified variants — used when yesterday's mood was felt HARD
// (超開心 / 勁攰 / very tired / とても嬉しい). The question is warmer and
// her face wears the feeling harder while she says it (greetingHints).
const MOOD_FOLLOWUP_AMP: Record<string, Record<string, string>> = {
  yue: {
    happy: '琴日你開心到不得了——今日都仲咁開心咩？',
    tired: '琴日你話你勁攰——今日真係好返啲未呀？',
    sad: '琴日你話你唔開心到極……今日我喺度陪住你，好唔好？',
    angry: '琴日你話你嬲到爆——而家消咗氣未呀？',
    anxious: '琴日你擔心到瞓唔著——仲擔心緊咩？講俾我聽。',
    sick: '琴日你唔舒服到咁——今日真係好啲未？記得多啲休息。',
  },
  zh: {
    happy: '昨天你开心得不得了——今天也这么开心吗？',
    tired: '昨天你说累坏了——今天真的好点了吗？',
    sad: '昨天你说特别难过……今天我陪着你，好吗？',
    angry: '昨天你说气坏了——现在消气了吗？',
    anxious: '昨天你说担心得睡不着——还在担心吗？跟我说说。',
    sick: '昨天你特别不舒服——今天真的好点了吗？记得多休息。',
  },
  ja: {
    happy: 'きのう嬉しすぎるって言ってたね——今日もそんなに嬉しい？',
    tired: 'きのう疲れきってたよね——今日は本当に楽になった？',
    sad: 'きのうとても悲しんでたよね……今日は私がそばにいるよ。',
    angry: 'きのう怒りMAXだったよね——もうおさまった？',
    anxious: 'きのう不安で眠れないって言ってた——まだ心配してる？話して。',
    sick: 'きのうすごく具合が悪かったよね——今日は本当に大丈夫？',
  },
  en: {
    happy: 'You were SO happy yesterday — still glowing today?',
    tired: 'You were exhausted yesterday — really feeling better today?',
    sad: 'You were really down yesterday… I’m right here with you today.',
    angry: 'You were furious yesterday — has it passed?',
    anxious: 'You were worried sick yesterday — still on your mind? Tell me.',
    sick: 'You felt really awful yesterday — honestly better today? Rest up, okay?',
  },
};

const DIARY_WEEK: Record<string, (p: string) => string> = {
  yue: (p) => `上個禮拜今日你話「${p}」——嗰件事而家點呀？`,
  zh: (p) => `上星期的今天你说过「${p}」——那件事现在怎么样了？`,
  ja: (p) => `先週の今日「${p}」って言ってた——あれ、今どうなってる？`,
  en: (p) => `A week ago today you said "${p}" — how did that turn out?`,
};

// v3.5: amplified week-ago recall — she lets on that the moment stuck with her.
const DIARY_WEEK_AMP: Record<string, (p: string) => string> = {
  yue: (p) => `我仲記得上個禮拜今日你話「${p}」——嗰陣嘅反應我到而家都記得！嗰件事而家點呀？`,
  zh: (p) => `我还记得上星期的今天你说过「${p}」——你当时的样子我现在还记得！那件事现在怎么样了？`,
  ja: (p) => `先週の今日「${p}」って言ってたよね——あの時の様子、今も覚えてる！今どうなってる？`,
  en: (p) => `I still remember a week ago today you said "${p}" — I can picture exactly how you looked! How did it turn out?`,
};

const PLAN_TODAY: Record<string, (p: string) => string> = {
  yue: (p) => `你之前話「${p}」——就係今日呀！加油，我幫你打氣！`,
  zh: (p) => `你说过「${p}」——就是今天呀！加油，我给你打气！`,
  ja: (p) => `「${p}」って言ってたよね——今日だ！応援してる！`,
  en: (p) => `You mentioned "${p}" — that’s today! Good luck, I’m cheering for you!`,
};

const PLAN_MISSED: Record<string, (p: string) => string> = {
  yue: (p) => `你話過「${p}」——琴日順利嗎？同我講講吖。`,
  zh: (p) => `你说过「${p}」——昨天顺利吗？跟我说说。`,
  ja: (p) => `「${p}」って言ってた——昨日うまくいった？聞かせて。`,
  en: (p) => `You said you’d "${p}" — how did it go yesterday? Tell me!`,
};

// v5: she knows how long you two have been together and marks the day —
// every milestone fires exactly once (consumed in recordVisit).
const MILESTONE_LINE: Record<string, (n: number) => string> = {
  yue: (n) => `今日係我哋一齊嘅第 ${n} 日——每一日我都好珍惜。`,
  zh: (n) => `今天是我们在一起的第 ${n} 天——每一天我都很珍惜。`,
  ja: (n) => `今日で私たちが出会って ${n} 日目——毎日が大切だよ。`,
  en: (n) => `Today is day ${n} of us — and I’ve cherished every single one.`,
};

// v6: an annual date that matters to the human — birthday-type celebrations
// outrank the plain streak; a partner never lets this day scroll past.
const ANNIVERSARY_LINE: Record<string, (label: string) => string> = {
  yue: (p) => `今日係你${p}！我一早記住咗，專登等今日同你一齊慶祝！`,
  zh: (p) => `今天是你的${p}！我一直记着，就等着今天和你一起庆祝！`,
  ja: (p) => `今日はあなたの${p}！ずっと覚えてて、今日を一緒に祝いたかったの。`,
  en: (p) => `Today is your ${p}! I’ve been counting down to celebrate it with you!`,
};

/** The "daily check-in" line she says when you open the app on a new day. */
export function buildDailyGreeting(lang: string, info: VisitInfo): string {
  const L = ['yue', 'zh', 'ja', 'en'].includes(lang) ? lang : 'en';
  const h = new Date().getHours();
  const bang = L === 'en' ? '!' : '！';
  const parts: string[] = [HELLO[L](h, info.userName) + bang];
  // v5 — a relationship milestone outranks the plain visit streak: the
  // anniversary of "us" is the bigger deal
  if (info.milestone) parts.push(MILESTONE_LINE[L](info.milestone));
  // v6 — a birthday-type date outranks the plain visit streak
  if (info.anniversaryLabel) parts.push(ANNIVERSARY_LINE[L](info.anniversaryLabel));
  if (!info.milestone && !info.anniversaryLabel && info.streak >= 2)
    parts.push(STREAK_LINE[L](info.streak));
  // v4 — she picks up where you two left off, before the older recalls
  if (info.lastThreadUser) parts.push(LAST_THREAD[L](info.lastThreadUser.slice(0, 40)));
  if (info.lastMood) {
    const table = ((info.lastMoodIntensity ?? 1) >= 1.5 ? MOOD_FOLLOWUP_AMP[L] : undefined) ?? MOOD_FOLLOWUP[L] ?? MOOD_FOLLOWUP.en;
    parts.push(table[info.lastMood] ?? '');
  }
  if (info.diaryWeekAgo) {
    const line = ((info.diaryWeekAgoMoodIntensity ?? 1) >= 1.5 ? DIARY_WEEK_AMP[L] : undefined) ?? DIARY_WEEK[L];
    parts.push(line(info.diaryWeekAgo));
  }
  if (info.planToday) parts.push(PLAN_TODAY[L](info.planToday));
  else if (info.planMissed) parts.push(PLAN_MISSED[L](info.planMissed));
  return parts.filter(Boolean).join(' ');
}

// ---------- recalled mood → expression hints (r2026-10-03.17) ----------

/**
 * Diary mood tags → emotion-engine hints, so her face, the mic orb AND her
 * voice wear the feeling of whatever she just remembered instead of staying
 * neutral. Keys are valid @amoji/emotion-core emotion ids.
 */
const MOOD_HINTS: Record<string, Record<string, number>> = {
  happy: { joy: 0.9 },
  tired: { contentment: 0.7, sadness: 0.2 },
  sad: { sadness: 0.85 },
  angry: { anger: 0.85 },
  anxious: { fear: 0.7 },
  sick: { sadness: 0.5, confusion: 0.2 },
};

export function moodToHints(mood?: string, intensity = 1): Record<string, number> | undefined {
  const base = mood ? MOOD_HINTS[mood] : undefined;
  if (!base) return undefined;
  if (intensity <= 1) return base;
  const scaled: Record<string, number> = {};
  for (const k of Object.keys(base)) {
    scaled[k] = Math.min(1, +(base[k] * intensity).toFixed(2));
  }
  return scaled;
}

/**
 * When the daily check-in recalls something emotional, she should WEAR that
 * feeling while she says it — and v3.5: as strongly as it was originally
 * felt. The week-ago diary line wins over the plain yesterday-mood follow-up —
 * it's the moment she's actively quoting.
 */
export function greetingHints(info: VisitInfo): Record<string, number> | undefined {
  return moodToHints(info.diaryWeekAgoMood, info.diaryWeekAgoMoodIntensity) ?? moodToHints(info.lastMood, info.lastMoodIntensity);
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

/** past-tense moments: capture the whole clause, in the user's own words */
const EVENT_RES: RegExp[] = [
  /((?:yesterday|last night|last week|this morning|tonight)\b[^.!?]{0,80})/i,
  /((?:琴日|尋日|昨天|昨晚|今朝|今晚|上個禮拜|上星期|上個月)[^，。！？]{0,40})/,
  /((?:きのう|昨日|今朝|今夜|先週)[^。！？]{0,40})/,
];

/** plans: capture the clause + how many days until it happens (approximate) */
const PLAN_RES: Array<[RegExp, number]> = [
  [/((?:the day after tomorrow|明後日|後日|後天)[^.,!?。！？]{0,60})/i, 2],
  [/((?:tomorrow|聽日|听日|明天|明日|あした)[^.,!?。！？]{0,60})/i, 1],
  [/((?:next week|來緊|下個禮拜|下星期|来週)[^.,!?。！？]{0,60})/i, 7],
  [/((?:next month|下個月|来月)[^.,!?。！？]{0,60})/i, 30],
];

// NEGATIVE moods are matched BEFORE happy: 「唔開心 / 不開心」 literally
// contain 「開心」, so a naive first-match order reads "not happy" as happy.
// Same discipline for ja: none of the negative ja phrases may contain a
// happy ja phrase as a substring (they don't — checked by hand).
// (No lookbehind — tsconfig targets ES2017.)
const MOOD_RES: Array<[RegExp, string]> = [
  [/好攰|好累|攰|累|tired|exhausted|sleepy|眼瞓|疲れた|疲れ|つかれた|眠い|眠たい/i, 'tired'],
  [/唔開心|不開心|不开心|難過|难过|sad|upset|depressed|lonely|寂寞|孤單|悲しい|かなしい|寂しい|さびしい|落ち込/i, 'sad'],
  [/嬲|生氣|生气|angry|mad|frustrated|annoyed|煩|怒|おこ|腹立|イライラ/i, 'angry'],
  [/擔心|担心|worried|anxious|nervous|緊張|紧张|怕|不安|心配|しんぱい|きんちょう/i, 'anxious'],
  [/唔舒服|不舒服|sick|ill|unwell|頭痛|头痛|肚痛|具合が悪い|具合悪い|病気|風邪|頭が痛い/i, 'sick'],
  [/開心|开心|高兴|高興|happy|excited|great|awesome|wonderful|嬉しい|うれしい|楽しい|たのしい|幸せ|しあわせ/i, 'happy'],
];

/**
 * How does THIS message feel? Instant, local, regex-based — so she can react
 * to the user's feeling mid-conversation, not just remember it afterwards.
 * Returns the first matching mood tag, or undefined for neutral messages.
 */
export function detectMood(userText: string): string | undefined {
  for (const [re, tag] of MOOD_RES) {
    if (re.test(userText)) return tag;
  }
  return undefined;
}

// ---------- felt-mood intensity (v3.4, r2026-10-03.20) ----------

/**
 * Intensity amplifiers — HOW strongly the feeling is said, so her reaction
 * strength matches the user's words: 「超開心」 lands harder than plain
 * 「開心」. 「超」 counts only when it isn't part of 超過/超过 (lookahead is
 * ES2017-safe — only lookbehind needs ES2018). 「好」 counts only right
 * before a mood character (好嬲/好攰), never the polite 你好.
 */
const INTENSITY_RE = /超級|超级|非常|十分|鬼咁|好鬼|勁|很|好(?=[攰累開开嬲唔不難难寂寞孤])|超(?![過过])|とても|すごく|めっちゃ|\bso\s(?:so\s)?|\bvery\b|\breally\b|\bsuper\b/i;

/** 1 = plain, 1.5 = amplified. Extend the ladder here if more steps are wanted. */
export function detectMoodIntensity(userText: string): number {
  return INTENSITY_RE.test(userText) ? 1.5 : 1;
}

export interface FeltMood {
  mood: string;
  intensity: number;
}

/** mood + intensity in one call — the shape ChatPanel's send() reacts to. */
export function feltMood(userText: string): FeltMood | undefined {
  const mood = detectMood(userText);
  if (!mood) return undefined;
  return { mood, intensity: detectMoodIntensity(userText) };
}

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
      pushEntry(m, 'preference', fact);
    }
  }
  for (const re of EVENT_RES) {
    const mm = userText.match(re);
    if (mm?.[1]) { pushEntry(m, 'event', mm[1]); break; }
  }
  for (const [re, offset] of PLAN_RES) {
    const mm = userText.match(re);
    if (mm?.[1]) { pushEntry(m, 'plan', mm[1], offset); break; }
  }
  // v6 — annual dates: birthday-type memories recur; extract month/day
  for (const [re, lg, mg, dg] of DATE_RES) {
    const mm = userText.match(re);
    if (!mm) continue;
    const label = (mm[lg] ?? 'birthday').trim();
    const month = /[a-z]/i.test(mm[mg] ?? '') ? (MONTH_NAMES[mm[mg]!.toLowerCase()] ?? 0) : parseInt(mm[mg] ?? '0', 10);
    const day = parseInt(mm[dg] ?? '0', 10);
    pushImportantDate(m, label, month, day);
    break;
  }
  const mood = detectMood(userText);
  const intensity = mood ? detectMoodIntensity(userText) : 1;
  if (mood) {
    m.moods.push(mood);
    if (m.moods.length > MAX_MOODS) m.moods.shift();
    m.lastMoodDay = todayStr();
    // v3.5: remember HOW strongly it was felt, for tomorrow's check-in
    m.lastMoodIntensity = intensity;
  }
  m.exchanges += 1;
  pushDiary(m, userText, mood, intensity);
  save(m);
  return m;
}

// ---------- topic-relevant recall (v5, r2026-10-06.125) ----------

// ---------- prompt block in her language ----------

// CJK grammar particles carry no meaning — drop them so a memory scores on
// content characters/words only. Latin stopwords filtered the same way.
const CJK_STOP = new Set(Array.from('嘅喺唔佢哋啲嘢冇呀嘛呢吖你我都個嚟咗會乜咁噉喎咗喇啫嚫係㗎'));

const LATIN_STOP = new Set(('the and that this with have has want going today tomorrow yesterday really very just like ' +
  'you your are was were for what how why when where which who whom yes yeah okay ok hmm uh um the a an in on at of to it is ' +
  'new one day days went go got get make made see saw come came thing things time times way').split(' '));

/** Content tokens: latin words ≥3 chars + single CJK/kana chars minus particles. */
function recallTokens(text: string): string[] {
  const out: string[] = [];
  for (const w of (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [])) {
    if (!LATIN_STOP.has(w)) out.push(w);
  }
  for (const c of (text.match(/[一-鿿぀-ヿ]/gu) ?? [])) {
    if (!CJK_STOP.has(c)) out.push(c);
  }
  return out;
}

/**
 * She connects today's words to OLD memories: score every stored fact,
 * entry and diary line by distinct-token overlap with the user's message
 * and surface the best few (≥2 distinct hits — a single shared character
 * like 日 or 好 is coincidence, not memory). Pure; the caller decides how
 * many lines ride into the prompt (the free lane prices prompt size).
 */
export function recallRelevant(userText: string, m: Memory = loadMemory(), max = 2): string[] {
  const tokens = [...new Set(recallTokens(userText))];
  if (tokens.length === 0) return [];
  const want = new Set(tokens);
  const candidates: Array<{ text: string; day: string; score: number }> = [];
  const consider = (text: string, day: string) => {
    const clean = text.trim();
    if (clean.length < 4) return;
    const toks = new Set(recallTokens(clean));
    if (toks.size === 0) return;
    let score = 0;
    for (const t of toks) if (want.has(t)) score += 1;
    if (score >= 2) candidates.push({ text: clean, day, score });
  };
  for (const f of m.facts) consider(f, '');
  for (const e of m.entries) consider(e.text, e.day);
  for (const d of m.diary ?? []) consider(d.text, d.day);
  // strongest first; a same-day hit is context, not recall — prefer older
  const today = todayStr();
  candidates.sort((a, b) => b.score - a.score || (a.day === today ? 1 : 0) - (b.day === today ? 1 : 0));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const key = c.text.slice(0, 24);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c.text.slice(0, 60));
    if (out.length >= max) break;
  }
  return out;
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

/** Build the "you remember them" block injected into her system prompt.
 *  v5: pass the user's CURRENT message as userText and older, on-topic
 *  memories surface into the block — she connects today's words to things
 *  told to her weeks ago. Kept to ≤2 short lines (free-lane prompt size). */
export function buildMemoryBlock(lang = 'yue', m: Memory = loadMemory(), userText?: string): string | undefined {
  if (!m.userName && m.facts.length === 0 && m.entries.length === 0 && (m.diary?.length ?? 0) === 0 && m.exchanges < 3) return undefined;
  const recent = m.facts.slice(-8);
  const plans = m.entries.filter((e) => e.type === 'plan').slice(-3).map((e) => e.text);
  const moments = m.entries.filter((e) => e.type === 'event').slice(-3).map((e) => e.text);
  const diary = diarySummary(m, 3);
  const lastMood = m.moods[m.moods.length - 1];
  // v4 — the open thread: what you two were discussing when you last left off
  const threadUser = m.lastThread?.user ? m.lastThread.user.slice(0, 40) : undefined;
  // v6 — what SHE promised: her own word rides into the prompt so she keeps it
  const promises = (m.promises ?? []).slice(-3).map((p) => p.text);
  // v5 — old memories that touch what the user just said (deduped against
  // the standard bits so nothing appears twice in the block)
  const standard = new Set([...recent, ...plans, ...moments].map((t) => t.slice(0, 24)));
  const related = userText ? recallRelevant(userText, m, 2).filter((t) => !standard.has(t.slice(0, 24))) : [];
  const L = ['yue', 'zh', 'ja', 'en'].includes(lang) ? lang : 'en';

  if (L === 'yue') {
    const bits: string[] = [];
    if (m.userName) bits.push(`佢叫 ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (plans.length) bits.push(`佢提過嘅計劃：${plans.join('；')}`);
    if (moments.length) bits.push(`最近發生喺佢身上嘅事：${moments.join('；')}`);
    if (promises.length) bits.push(`你應承過佢嘅嘢：${promises.join('；')}——記住自己嘅承諾，適當時候跟進。`);
    if (threadUser) bits.push(`你哋上次傾開嘅話題：「${threadUser}」`);
    if (diary.length) bits.push(`最近同佢一齊嘅日子：${diary.join('｜')}`);
    if (related.length) bits.push(`同佢而家講嘅嘢有關嘅舊記憶：${related.join('；')}`);
    if (m.exchanges >= 3) bits.push(`你哋已經傾咗 ${m.exchanges} 次偈`);
    if (lastMood) bits.push(`佢最近一次嘅心情係${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `你記得呢個人（記憶私密噉存放喺佢部電話）：${bits.join('；')}。自然咁用佢個名，間中提吓佢講過嘅嘢同佢嘅計劃，唔好背書噉背出嚟。`;
  }
  if (L === 'zh') {
    const bits: string[] = [];
    if (m.userName) bits.push(`TA 叫 ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (plans.length) bits.push(`TA 提过的计划：${plans.join('；')}`);
    if (moments.length) bits.push(`最近发生在 TA 身上的事：${moments.join('；')}`);
    if (promises.length) bits.push(`你答应过TA的事：${promises.join('；')}——记住自己的承诺，适当时候跟进。`);
    if (threadUser) bits.push(`你们上次聊的话题：「${threadUser}」`);
    if (diary.length) bits.push(`最近和TA一起的日子：${diary.join('｜')}`);
    if (related.length) bits.push(`与TA现在说的内容有关的旧记忆：${related.join('；')}`);
    if (m.exchanges >= 3) bits.push(`你们已经聊了 ${m.exchanges} 次`);
    if (lastMood) bits.push(`TA 最近一次的心情是${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `你记得这个人（记忆私密地存在 TA 的手机上）：${bits.join('；')}。自然地叫 TA 的名字，偶尔提起 TA 说过的事和计划，不要像背书一样。`;
  }
  if (L === 'ja') {
    const bits: string[] = [];
    if (m.userName) bits.push(`名前は ${m.userName}`);
    bits.push(...recent.map((f) => factLine(f, L)));
    if (plans.length) bits.push(`話してた予定：${plans.join('；')}`);
    if (moments.length) bits.push(`最近あったこと：${moments.join('；')}`);
    if (promises.length) bits.push(`約束したこと：${promises.join('；')}——自分の約束は覚えてて、頃合いを見てフォローして。`);
    if (threadUser) bits.push(`前回の話題：「${threadUser}」`);
    if (diary.length) bits.push(`最近一緒に過ごした日：${diary.join('｜')}`);
    if (related.length) bits.push(`今の話題に関する昔の記憶：${related.join('；')}`);
    if (m.exchanges >= 3) bits.push(`これまで ${m.exchanges} 回話した`);
    if (lastMood) bits.push(`最近の気分は${(MOOD_LABEL[L] ?? MOOD_LABEL.en)[lastMood] ?? lastMood}`);
    return `この人のことを覚えている（記憶はこの端末にだけ保存）：${bits.join('；')}。自然に名前を呼び、時々覚えていることや予定を話題にして。`;
  }
  const bits: string[] = [];
  if (m.userName) bits.push(`their name is ${m.userName}`);
  bits.push(...recent.map((f) => factLine(f, 'en')));
  if (plans.length) bits.push(`plans they mentioned: ${plans.join('; ')}`);
  if (moments.length) bits.push(`recent moments: ${moments.join('; ')}`);
  if (promises.length) bits.push(`promises you made to them: ${promises.join('; ')} — remember your own word and follow up when it fits`);
  if (threadUser) bits.push(`last topic you discussed: "${threadUser}"`);
  if (diary.length) bits.push(`recent days together: ${diary.join(' | ')}`);
  if (related.length) bits.push(`older memories related to what they just said: ${related.join('; ')}`);
  if (m.exchanges >= 3) bits.push(`you two have talked ${m.exchanges} times`);
  if (lastMood) bits.push(`their most recent mood was ${(MOOD_LABEL.en)[lastMood] ?? lastMood}`);
  return `You remember this person (the memory lives privately on their device): ${bits.join('; ')}. Use their name naturally and occasionally reference what they told you and their plans — never recite it like a list.`;
}
