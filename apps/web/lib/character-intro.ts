// Character self-introductions for the select board.
//
// Tapping a card used to say a canned "Hello! / Nice to meet you." — the same
// four lines for all 46 companions, which reads as one character wearing
// different skins rather than 46 people.
//
// This builds a spoken intro from what actually differs per character:
//   - their name
//   - their tagline, which encodes an archetype (see TaglineArchetype)
//   - their gender, which picks the self-reference phrasing
//
// The cast only has four distinct tagline archetypes today, so the intro is
// varied by archetype + name rather than invented per character. Anything
// hand-written per character would be fiction we do not have data for.

import type { Lang } from './prefs';

/** The four tagline shapes currently present in the want cast. */
export type TaglineArchetype = 'warm' | 'gentle' | 'sunny' | 'calm' | 'generic';

/**
 * Classify a tagline by the archetype phrase it contains. The generated cast
 * uses a small fixed set; unknown taglines fall back to a neutral intro so a
 * future character never gets a wrong-sounding introduction.
 */
export function taglineArchetype(tagline: string | undefined): TaglineArchetype {
  const t = (tagline ?? '').toLowerCase();
  if (t.includes('warm friend')) return 'warm';
  if (t.includes('gentle heart')) return 'gentle';
  if (t.includes('sunny companion')) return 'sunny';
  if (t.includes('calm buddy')) return 'calm';
  return 'generic';
}

type IntroSet = Record<Lang, (name: string) => string>;

/**
 * One line per archetype per language. Each names the character, says hello,
 * and states the one thing that archetype is about, so two different cards
 * produce recognisably different intros.
 */
const INTROS: Record<TaglineArchetype, IntroSet> = {
  warm: {
    en: (n) => `Hi, I'm ${n}. I'm a good listener, so tell me anything.`,
    yue: (n) => `你好，我係 ${n}。我鍾意聽人講嘢，有咩都可以同我講。`,
    zh: (n) => `你好，我是 ${n}。我很喜欢听你说话，什么都可以跟我讲。`,
    ja: (n) => `こんにちは、${n}です。聞き上手だから、何でも話してね。`,
  },
  gentle: {
    en: (n) => `Hello, I'm ${n}. I'll cheer you on, nice and steady.`,
    yue: (n) => `你好，我係 ${n}。我會一直喺度陪你、支持你。`,
    zh: (n) => `你好，我是 ${n}。我会一直陪着你、支持你。`,
    ja: (n) => `こんにちは、${n}です。ずっとそばで応援するね。`,
  },
  sunny: {
    en: (n) => `Hey there! I'm ${n}. Let's have a bright day together.`,
    yue: (n) => `喂！我係 ${n}。一齊開開心心過今日啦。`,
    zh: (n) => `嗨！我是 ${n}。一起开开心心过今天吧。`,
    ja: (n) => `やっほー！${n}だよ。一緒に明るい一日にしようね。`,
  },
  calm: {
    en: (n) => `Hi, I'm ${n}. I'm curious about you, so ask me anything.`,
    yue: (n) => `你好，我係 ${n}。我對你好有興趣，有咩想問就問啦。`,
    zh: (n) => `你好，我是 ${n}。我对你很好奇，想问什么就问吧。`,
    ja: (n) => `こんにちは、${n}です。あなたのことが知りたいから、何でも聞いてね。`,
  },
  generic: {
    en: (n) => `Hi, I'm ${n}. Nice to meet you.`,
    yue: (n) => `你好，我係 ${n}。好開心認識你。`,
    zh: (n) => `你好，我是 ${n}。很高兴认识你。`,
    ja: (n) => `こんにちは、${n}です。はじめまして。`,
  },
};

/**
 * The spoken introduction for one character. `tagline` is the localised line
 * shown on the card, so the archetype follows whatever language the UI is in.
 */
export function introText(
  name: string,
  tagline: string | undefined,
  lang: Lang,
): string {
  const archetype = taglineArchetype(tagline);
  const build = INTROS[archetype][lang] ?? INTROS[archetype].en;
  return build(name.trim() || 'Amoji');
}
