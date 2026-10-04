'use client';
// Top-left status plate: character name plate + live mood + app status.
// Tapping it returns to the character-selection page.
// r2026-10-04.91 (Master Simon): while her model/clips load, a MINI
// spinner + the real percentage live here inside the status row (the old
// big bottom-left ring could sit at 99% forever on a stalled request).
// r2026-10-05.99: live voice-tier health next to the name — a green dot
// flashes the moment any voice tier actually plays (fades after 5s), a red
// ✗ sticks when a tier reports failure. Fueled by `amoji:voice-status` from
// lib/voice, so a silent iPhone now SHOWS which tier died instead of
// leaving Master Simon guessing.
// r2026-10-05.100: the dot also answers "was speak() even CALLED?" —
// 'attempt' events from the speak() choke point get the 'speak' label and
// the tooltip prefers the event's own detail, so a silent phone shows
// "speak: speak attempt · 12 chars · chain synth" vs a tier name.
// r2026-10-05.102 (Master Simon): two fixes — (1) the loading row is honest
// and bounded: a number still counts up, but the reveal-gate wait renders as
// an indeterminate "preparing…" (never a frozen 99%), and the 25s watchdog
// still retires the spinner outright; (2) the plate no longer blacks out or
// covers her face: it is a smaller, fully opaque rounded pill (solid bg +
// blur, compact avatar + type) tucked to the top-left corner, clear of the
// character's head area on narrow phone screens.
import { useEffect, useState } from 'react';
import { getLatestFrame, dominantMood, type MoodId } from '../lib/companion';
import { getLoadProgress, onLoadProgress, type LoadProgress } from '../lib/load-progress';
import { assetUrl } from '../lib/asset';
import { t, type Lang, type StrKey } from '../lib/prefs';
import type { ChatStatus } from '../lib/status';

const MOOD_EMOJI: Record<MoodId, string> = {
  joy: '😊', angry: '😠', sad: '😢', surprised: '😲', relaxed: '😌', neutral: '🙂',
};
const MOOD_LABEL: Record<MoodId, StrKey> = {
  joy: 'moodJoy', angry: 'moodAngry', sad: 'moodSad', surprised: 'moodSurprised', relaxed: 'moodRelaxed', neutral: 'moodNeutral',
};
const STATUS_LABEL: Record<ChatStatus, StrKey> = {
  idle: 'statusIdle', thinking: 'statusThinking', speaking: 'statusSpeaking', listening: 'statusListening',
};

export default function StatusPlate({
  name,
  accent,
  portrait,
  lang,
  status,
  memCount,
  kid,
  onOpenSelect,
}: {
  name: string;
  accent: string;
  portrait?: string;
  lang: Lang;
  status: ChatStatus;
  memCount: number;
  /** Kid Mode is on — show the 🧸 badge */
  kid?: boolean;
  onOpenSelect: () => void;
}) {
  const [mood, setMood] = useState<MoodId>('neutral');
  useEffect(() => {
    const id = setInterval(() => setMood(dominantMood(getLatestFrame())), 250);
    return () => clearInterval(id);
  }, []);

  // r91: character-loading progress published by CompanionCanvas — a mini
  // spinner in the status row, null the moment she's on stage. r102: the
  // value can also be 'prep' (the reveal gate is waiting for textures /
  // first frames) — rendered as an indeterminate "preparing…", never a %.
  const [loadingPct, setLoadingPct] = useState<LoadProgress>(getLoadProgress());
  useEffect(() => onLoadProgress(setLoadingPct), []);

  // r99: voice-tier health dot — green flash on audible playback (fades in
  // 5s), red ✗ sticky on failure. Labels are hardcoded here (rather than
  // imported from lib/voice) to keep this component free of voice-module
  // imports; the wire format is the `amoji:voice-status` CustomEvent.
  // r100: 'attempt' events (the speak() choke point) get their own label and
  // the tooltip prefers the event's own detail string when present.
  const [voiceDot, setVoiceDot] = useState<{ ok: boolean; title: string } | null>(null);
  useEffect(() => {
    let fade: ReturnType<typeof setTimeout> | null = null;
    const onStatus = (e: Event) => {
      const d = (e as CustomEvent).detail as { tier?: string; ok?: boolean; detail?: string } | undefined;
      if (!d?.tier) return;
      const label = d.tier === 'edge' ? 'edge-tts' : d.tier === 'gtts' ? 'google-tts' : d.tier === 'attempt' ? 'speak' : 'browser voice';
      setVoiceDot({ ok: !!d.ok, title: `🎙 ${label}: ${d.detail ?? (d.ok ? 'playing' : 'failed')}` });
      if (fade) clearTimeout(fade);
      if (d.ok) fade = setTimeout(() => setVoiceDot(null), 5_000);
    };
    window.addEventListener('amoji:voice-status', onStatus);
    return () => {
      window.removeEventListener('amoji:voice-status', onStatus);
      if (fade) clearTimeout(fade);
    };
  }, []);

  return (
    // r102: a compact, OPAQUE pill. The old translucent bg-black/30 read as a
    // black smear over the transparent canvas and, being wide, could reach
    // into her face on narrow phones. Solid black/55 + blur keeps it readable
    // without visually "cutting" the character; the tighter padding/avatar
    // keep it tucked into the corner, clear of her head area.
    <button
      onClick={onOpenSelect}
      title={t(lang, 'openSelect')}
      className="ui-btn flex max-w-[46vw] items-center gap-2 rounded-full border border-white/10 bg-black/55 py-1 pl-1 pr-3 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/70"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-black/70"
        style={{ background: portrait ? '#0b0b12' : `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent})` }}
      >
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(portrait)} alt={name} draggable={false} className="h-full w-full object-cover object-top" />
        ) : (
          name[0]
        )}
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
          <span className="max-w-[18vw] truncate">{name}</span>
          {voiceDot && (voiceDot.ok ? (
            <span title={voiceDot.title} className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          ) : (
            <span title={voiceDot.title} className="shrink-0 text-[10px] leading-none text-red-400">✗</span>
          ))}
          {kid && <span title="Kid mode">🧸</span>}
          {memCount > 0 && (
            <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-normal text-white/70">🧠{memCount}</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-white/60">
          {loadingPct === 'prep' && (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3.5" />
                <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="14 49" />
              </svg>
              <span className="text-white/85">{t(lang, 'statusPreparing')}</span>
              <span className="text-white/25">·</span>
            </>
          )}
          {typeof loadingPct === 'number' && (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3.5" />
                <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="14 49" />
              </svg>
              <span className="tabular-nums text-white/85">{loadingPct}%</span>
              <span className="text-white/25">·</span>
            </>
          )}
          <span>{MOOD_EMOJI[mood]}</span>
          <span className="max-w-[16vw] truncate">{t(lang, MOOD_LABEL[mood])}</span>
          <span className="text-white/25">·</span>
          <span className={status === 'listening' ? 'text-white/90' : ''}>{t(lang, STATUS_LABEL[status])}</span>
        </span>
      </span>
    </button>
  );
}
