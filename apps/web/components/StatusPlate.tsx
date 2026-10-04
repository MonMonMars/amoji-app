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
import { useEffect, useState } from 'react';
import { getLatestFrame, dominantMood, type MoodId } from '../lib/companion';
import { getLoadProgress, onLoadProgress } from '../lib/load-progress';
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

  // r91: character-loading percentage published by CompanionCanvas — a mini
  // spinner + % in the status row, null the moment she's on stage.
  const [loadingPct, setLoadingPct] = useState<number | null>(getLoadProgress());
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
    <button
      onClick={onOpenSelect}
      title={t(lang, 'openSelect')}
      className="ui-btn flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 py-1.5 pl-1.5 pr-4 backdrop-blur-md hover:bg-black/50"
    >
      <span
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-black/70"
        style={{ background: portrait ? '#0b0b12' : `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent})` }}
      >
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(portrait)} alt={name} draggable={false} className="h-full w-full object-cover object-top" />
        ) : (
          name[0]
        )}
      </span>
      <span className="text-left leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {name}
          {voiceDot && (voiceDot.ok ? (
            <span title={voiceDot.title} className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          ) : (
            <span title={voiceDot.title} className="text-[10px] leading-none text-red-400">✗</span>
          ))}
          {kid && <span title="Kid mode">🧸</span>}
          {memCount > 0 && (
            <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-normal text-white/70">🧠{memCount}</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-white/60">
          {loadingPct !== null && (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3.5" />
                <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="14 49" />
              </svg>
              <span className="tabular-nums text-white/85">{loadingPct}%</span>
              <span className="text-white/25">·</span>
            </>
          )}
          <span>{MOOD_EMOJI[mood]}</span>
          <span>{t(lang, MOOD_LABEL[mood])}</span>
          <span className="text-white/25">·</span>
          <span className={status === 'listening' ? 'text-white/90' : ''}>{t(lang, STATUS_LABEL[status])}</span>
        </span>
      </span>
    </button>
  );
}
