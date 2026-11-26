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
 * `artist` names the performer for a streamed provider bed — CC licences
 * require the author to be credited, and the intro is the only spoken surface.
 */
export function performanceIntroLine(
  kind: PerformanceKind | 'music',
  title: string,
  lang: string,
  genre?: string,
  artist?: string,
): string {
  const name = title.trim() || (kind === 'song' ? 'a song' : 'a track');
  const g = (genre ?? '').trim();
  const a = (artist ?? '').trim();
  const parts = [name];
  if (a && !name.toLowerCase().includes(a.toLowerCase())) parts.push(a);
  if (g && !name.toLowerCase().includes(g.toLowerCase())) parts.push(g);
  const named = parts.join(' · ');
  const L: IntroLang =
    lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  const isSong = kind === 'song';
  // Owner 2026-11-26: a reply must not open on a lone word. The old text began
  // "好！呢首叫…", which the clause splitter turned into its own "好！" bubble.
  // A comma keeps the opener inside the first sentence.
  if (L === 'yue') {
    return isSong
      ? `好，呢首叫「${named}」——我而家唱俾你聽。`
      // Pixel: say "let's start" — never 「起！」 (that means "rise").
      : `好，呢段音樂叫「${named}」——我哋開始！`;
  }
  if (L === 'zh') {
    return isSong
      ? `好，这首叫「${named}」——我现在唱给你听。`
      : `好，这段音乐叫「${named}」——我们开始！`;
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
