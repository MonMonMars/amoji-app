import { describe, expect, it } from 'vitest';
import {
  addEntry, buildDailyGreeting, buildMemoryBlock, deleteEntry, detectMood, detectMoodIntensity, editEntry, feltMood,
  diarySummary, greetingHints, moodToHints, recordVisit,
  rememberExchange, type Memory,
} from '../lib/memory';

function fresh(): Memory {
  return { facts: [], exchanges: 0, moods: [], updatedAt: '', entries: [] };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toDateString();
}

describe('memory v2 typed entries', () => {
  it('captures a plan with a due day (tomorrow → +1)', () => {
    const m = fresh();
    rememberExchange('聽日我要去日本旅行呀', m);
    const plan = m.entries.find((e) => e.type === 'plan');
    expect(plan).toBeDefined();
    expect(plan!.dueDay).toBe(new Date(Date.now() + 86_400_000).toDateString());
  });

  it('captures past moments', () => {
    const m = fresh();
    rememberExchange('yesterday I went hiking with my dog', m);
    expect(m.entries.some((e) => e.type === 'event')).toBe(true);
  });

  it('captures preferences into typed entries AND legacy facts', () => {
    const m = fresh();
    rememberExchange('I love ramen', m);
    expect(m.entries.some((e) => e.type === 'preference')).toBe(true);
    expect(m.facts.some((f) => f.startsWith('likes:'))).toBe(true);
  });

  it('dedupes identical entries', () => {
    const m = fresh();
    rememberExchange('聽日要去睇醫生', m);
    rememberExchange('聽日要去睇醫生', m);
    expect(m.entries.filter((e) => e.type === 'plan').length).toBe(1);
  });

  it('add / edit / delete entries', () => {
    const m = fresh();
    const e = addEntry('preference', 'likes: hiking', m);
    expect(e).toBeDefined();
    editEntry(e!.id, 'likes: trail running', m);
    expect(m.entries[0]!.text).toBe('likes: trail running');
    deleteEntry(e!.id, m);
    expect(m.entries.length).toBe(0);
  });

  it('injects plans and moments into the memory block', () => {
    const m = fresh();
    m.userName = 'Simon';
    rememberExchange('tomorrow I have a job interview', m);
    rememberExchange('yesterday I adopted a cat', m);
    const block = buildMemoryBlock('en', m)!;
    expect(block).toContain('job interview');
    expect(block).toContain('adopted a cat');
  });

  it('daily greeting cheers a plan due today', () => {
    const line = buildDailyGreeting('yue', { isNewDay: true, streak: 1, planToday: '去面試' });
    expect(line).toContain('去面試');
  });

  it('daily greeting asks about a plan that was due yesterday', () => {
    const line = buildDailyGreeting('en', { isNewDay: true, streak: 2, planMissed: 'see the dentist' });
    expect(line).toContain('see the dentist');
  });
});

// ---------- v3 emotion diary (r2026-10-03.14) ----------

describe('emotion diary', () => {
  it('writes a mood-tagged diary line per exchange', () => {
    const m = fresh();
    rememberExchange('今天好開心呀，覺得 happy', m);
    expect(m.diary?.length).toBe(1);
    expect(m.diary![0]!.mood).toBe('happy');
    expect(m.diary![0]!.text.length).toBeGreaterThan(0);
    expect(m.diary![0]!.exchangeNo).toBe(1);
  });

  it('skips an exact duplicate line on the same day', () => {
    const m = fresh();
    rememberExchange('hello there', m);
    rememberExchange('hello there', m);
    expect(m.diary?.length).toBe(1);
  });

  it('caps the diary and drops the oldest lines', () => {
    const m = fresh();
    for (let i = 0; i < 35; i++) rememberExchange(`message number ${i}`, m);
    expect(m.diary!.length).toBe(30);
  });

  it('summarises one line per day with moods', () => {
    const m = fresh();
    m.diary = [
      { id: '1', day: daysAgo(2), text: 'went hiking with the dog', mood: 'happy', exchangeNo: 1 },
      { id: '2', day: daysAgo(2), text: 'felt tired at night', mood: 'tired', exchangeNo: 2 },
      { id: '3', day: daysAgo(0), text: 'big interview today', exchangeNo: 3 },
    ];
    const lines = diarySummary(m);
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('felt tired at night'); // last line of that day
    expect(lines[0]).toContain('[happy/tired]');
    expect(lines[1]).toContain('big interview');
  });

  it('injects recent diary days into the memory block', () => {
    const m = fresh();
    m.userName = 'Simon';
    m.exchanges = 5;
    rememberExchange('yesterday I adopted a cat', m);
    const block = buildMemoryBlock('en', m)!;
    expect(block).toContain('adopted a cat');
  });

  it('daily greeting recalls this day last week from the diary', () => {
    const line = buildDailyGreeting('yue', { isNewDay: true, streak: 3, diaryWeekAgo: '去咗行山' });
    expect(line).toContain('去咗行山');
  });
});

// ---------- r2026-10-03.17: recalled mood shapes her face, orb and voice ----------

describe('recalled-mood expression hints', () => {
  it('maps diary mood tags to emotion hints', () => {
    expect(moodToHints('happy')).toEqual({ joy: 0.9 });
    expect(moodToHints('sad')).toEqual({ sadness: 0.85 });
    expect(moodToHints('angry')).toEqual({ anger: 0.85 });
    expect(moodToHints('anxious')).toEqual({ fear: 0.7 });
    expect(moodToHints('unknown-tag')).toBeUndefined();
    expect(moodToHints(undefined)).toBeUndefined();
  });

  it('week-ago diary mood wins over yesterday mood for the greeting', () => {
    const fromDiary = greetingHints({ isNewDay: true, streak: 2, lastMood: 'tired', diaryWeekAgo: '行山', diaryWeekAgoMood: 'happy' });
    expect(fromDiary).toEqual({ joy: 0.9 });
    const fromYesterday = greetingHints({ isNewDay: true, streak: 2, lastMood: 'sad' });
    expect(fromYesterday).toEqual({ sadness: 0.85 });
    expect(greetingHints({ isNewDay: true, streak: 1 })).toBeUndefined();
  });

  it('recordVisit carries the week-ago diary mood', () => {
    const m = fresh();
    m.lastVisit = daysAgo(1);
    m.diary = [{ id: 'w', day: daysAgo(7), text: 'went hiking and felt so happy', mood: 'happy', exchangeNo: 1 }];
    const info = recordVisit(m);
    expect(info.diaryWeekAgo).toContain('went hiking');
    expect(info.diaryWeekAgoMood).toBe('happy');
  });
});

// ---------- r2026-10-03.18: she reacts mid-conversation to how the user feels ----------

describe('felt-mood detection for instant reactions', () => {
  it('detects the mood of a message across English, Cantonese and Mandarin', () => {
    expect(detectMood("I'm so happy today!")).toBe('happy');
    expect(detectMood('琴日好攰，成日都眼瞓')).toBe('tired');
    expect(detectMood('最近有點不開心')).toBe('sad');
    expect(detectMood('今天很开心呀')).toBe('happy');
    expect(detectMood("let's meet at 3pm tomorrow")).toBeUndefined();
  });

  it('a felt mood feeds the diary and maps to expression hints', () => {
    const m = fresh();
    rememberExchange('feeling really sad lately', m);
    expect(m.moods[m.moods.length - 1]).toBe('sad');
    expect(m.diary![0]!.mood).toBe('sad');
    expect(moodToHints(detectMood('feeling really sad lately'))).toEqual({ sadness: 0.85 });
  });
});

// ---------- r2026-10-03.19: Japanese felt-mood phrases ----------

describe('Japanese felt-mood detection', () => {
  it('detects ja happy moods without tripping a negative first', () => {
    expect(detectMood('今日はとても嬉しい！')).toBe('happy');
    expect(detectMood('今日はとても楽しい')).toBe('happy');
    expect(detectMood('しあわせだなあ')).toBe('happy');
  });

  it('detects ja negative moods (matched before happy)', () => {
    expect(detectMood('最近とても疲れた')).toBe('tired');
    expect(detectMood('少し寂しいな')).toBe('sad');
    expect(detectMood('ちょっと怒ってる')).toBe('angry');
    expect(detectMood('なんだか不安だ')).toBe('anxious');
    expect(detectMood('具合が悪いみたい')).toBe('sick');
  });

  it('a ja felt mood feeds the diary and maps to expression hints', () => {
    const m = fresh();
    rememberExchange('今日はとても嬉しい！', m);
    expect(m.moods[m.moods.length - 1]).toBe('happy');
    expect(m.diary![0]!.mood).toBe('happy');
    expect(moodToHints(detectMood('ちょっと寂しい'))).toEqual({ sadness: 0.85 });
  });
});

// ---------- r2026-10-03.20: felt-mood intensity ----------

describe('felt-mood intensity', () => {
  it('amplifiers raise the intensity; plain moods stay gentle', () => {
    expect(detectMoodIntensity('今日超開心！')).toBe(1.5);
    expect(detectMoodIntensity('勁攰呀')).toBe(1.5);
    expect(detectMoodIntensity('好嬲呀你')).toBe(1.5);
    expect(detectMoodIntensity('very tired')).toBe(1.5);
    expect(detectMoodIntensity('今日はとても嬉しい')).toBe(1.5);
    expect(detectMoodIntensity('開心')).toBe(1);
    expect(detectMoodIntensity('琴日有點攰')).toBe(1);
    expect(detectMoodIntensity('你好，食咗飯未呀')).toBe(1); // 好 must not fire alone
  });

  it('超 only amplifies when not part of 超過/超过', () => {
    expect(detectMoodIntensity('超過分呀')).toBe(1);
    expect(detectMoodIntensity('超開心')).toBe(1.5);
  });

  it('feltMood bundles mood + intensity; scaling clamps at 1', () => {
    expect(feltMood('超開心呀今日')).toEqual({ mood: 'happy', intensity: 1.5 });
    expect(feltMood('琴日有點攰')).toEqual({ mood: 'tired', intensity: 1 });
    expect(feltMood('hello there')).toBeUndefined();
    expect(moodToHints('happy', 1.5)).toEqual({ joy: 1 }); // 0.9 × 1.5 → clamped
    expect(moodToHints('tired', 1.5)).toEqual({ contentment: 1, sadness: 0.3 });
    expect(moodToHints('happy')).toEqual({ joy: 0.9 }); // default intensity unchanged
  });
});

// ---------- r2026-10-03.22: the diary remembers how strongly it felt ----------

describe('diary mood intensity', () => {
  it('stores amplified and plain intensity on diary lines', () => {
    const m = fresh();
    rememberExchange('今日超開心！', m);
    expect(m.diary![0]!.mood).toBe('happy');
    expect(m.diary![0]!.intensity).toBe(1.5);
    const m2 = fresh();
    rememberExchange('今日開心', m2);
    expect(m2.diary![0]!.mood).toBe('happy');
    expect(m2.diary![0]!.intensity).toBe(1);
    const m3 = fresh();
    rememberExchange('see you at 3pm', m3);
    expect(m3.diary![0]!.intensity).toBeUndefined(); // no mood → no intensity
  });

  it('recordVisit carries yesterday-mood and week-ago intensities', () => {
    const m = fresh();
    m.lastVisit = daysAgo(1);
    m.moods = ['happy'];
    m.lastMoodDay = daysAgo(1);
    m.lastMoodIntensity = 1.5;
    m.diary = [{ id: 'w', day: daysAgo(7), text: '超開心的一天', mood: 'happy', intensity: 1.5, exchangeNo: 1 }];
    const info = recordVisit(m);
    expect(info.lastMood).toBe('happy');
    expect(info.lastMoodIntensity).toBe(1.5);
    expect(info.diaryWeekAgoMoodIntensity).toBe(1.5);
  });

  it('greeting hints scale with the recalled intensity', () => {
    const amp = greetingHints({ isNewDay: true, streak: 1, lastMood: 'happy', lastMoodIntensity: 1.5 });
    expect(amp).toEqual({ joy: 1 }); // 0.9 × 1.5 → clamped
    const plain = greetingHints({ isNewDay: true, streak: 1, lastMood: 'happy', lastMoodIntensity: 1 });
    expect(plain).toEqual({ joy: 0.9 });
  });

  it('an amplified yesterday mood gets the stronger follow-up line', () => {
    const amp = buildDailyGreeting('en', { isNewDay: true, streak: 1, lastMood: 'happy', lastMoodIntensity: 1.5 });
    expect(amp).toContain('SO happy');
    const plain = buildDailyGreeting('en', { isNewDay: true, streak: 1, lastMood: 'happy', lastMoodIntensity: 1 });
    expect(plain).not.toContain('SO happy');
    expect(plain).toContain('happy yesterday');
  });

  it('an amplified week-ago memory gets the warmer recall line', () => {
    const amp = buildDailyGreeting('en', { isNewDay: true, streak: 1, diaryWeekAgo: 'won the match', diaryWeekAgoMood: 'happy', diaryWeekAgoMoodIntensity: 1.5 });
    expect(amp).toContain('I still remember');
    const plain = buildDailyGreeting('en', { isNewDay: true, streak: 1, diaryWeekAgo: 'won the match', diaryWeekAgoMood: 'happy', diaryWeekAgoMoodIntensity: 1 });
    expect(plain).not.toContain('I still remember');
  });

  it('diary summary marks amplified moods with !', () => {
    const m = fresh();
    m.diary = [
      { id: '1', day: daysAgo(1), text: 'won the lottery today', mood: 'happy', intensity: 1.5, exchangeNo: 1 },
      { id: '2', day: daysAgo(1), text: 'feeling calm now', mood: 'content', exchangeNo: 2 },
    ];
    const line = diarySummary(m)[0]!;
    // multi-mood days join with '/', so the ! sits inside the tag list
    expect(line).toContain('[happy!/content]');
  });
});
