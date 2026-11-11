// Spoken one-liner that names the song / track BEFORE the bed starts.
// Keeps titles free of the "· female/male" voice suffix used on-screen.

import type { PerformanceClip, PerformanceKind, PerformanceLang } from './performance-clips';

export type IntroLang = PerformanceLang;

/** Display/speak title without the sung-voice suffix. */
export function clipTitle(clip: PerformanceClip, lang: string): string {
  const key: IntroLang =
    lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  return clip.labels[key] ?? clip.labels.en;
}

/**
 * Companion introduces the piece by name (and optional genre), then playback
 * starts after speech idle. `kind` song → "song"; dance / beds → "music".
 */
export function performanceIntroLine(
  kind: PerformanceKind | 'music',
  title: string,
  lang: string,
  genre?: string,
): string {
  const name = title.trim() || (kind === 'song' ? 'a song' : 'a track');
  const g = (genre ?? '').trim();
  const named = g && !name.toLowerCase().includes(g.toLowerCase()) ? `${name} · ${g}` : name;
  const L: IntroLang =
    lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  const isSong = kind === 'song';
  if (L === 'yue') {
    return isSong
      ? `好！呢首叫「${named}」——我而家唱俾你聽。`
      // Pixel: say "let's start" — never 「起！」 (that means "rise").
      : `好！呢段音樂叫「${named}」——我哋開始！`;
  }
  if (L === 'zh') {
    return isSong
      ? `好！这首叫「${named}」——我现在唱给你听。`
      : `好！这段音乐叫「${named}」——我们开始！`;
  }
  if (L === 'ja') {
    return isSong
      ? `うん、この曲は「${named}」——いま歌うね。`
      : `うん、この曲は「${named}」——スタート！`;
  }
  return isSong
    ? `Okay — this song is called "${named}." Listen up.`
    : `Alright — this track is "${named}." Let's start!`;
}
