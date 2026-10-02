'use client';
// Top-left status plate: character name plate + live mood + app status.
// Tapping it returns to the character-selection page.
import { useEffect, useState } from 'react';
import { getLatestFrame, dominantMood, type MoodId } from '../lib/companion';
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
  lang,
  status,
  memCount,
  onOpenSelect,
}: {
  name: string;
  accent: string;
  lang: Lang;
  status: ChatStatus;
  memCount: number;
  onOpenSelect: () => void;
}) {
  const [mood, setMood] = useState<MoodId>('neutral');
  useEffect(() => {
    const id = setInterval(() => setMood(dominantMood(getLatestFrame())), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={onOpenSelect}
      title={t(lang, 'openSelect')}
      className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 py-1.5 pl-1.5 pr-4 backdrop-blur-md transition hover:bg-black/50"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-black/70"
        style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent})` }}
      >
        {name[0]}
      </span>
      <span className="text-left leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {name}
          {memCount > 0 && (
            <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-normal text-white/70">🧠{memCount}</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-white/60">
          <span>{MOOD_EMOJI[mood]}</span>
          <span>{t(lang, MOOD_LABEL[mood])}</span>
          <span className="text-white/25">·</span>
          <span className={status === 'listening' ? 'text-white/90' : ''}>{t(lang, STATUS_LABEL[status])}</span>
        </span>
      </span>
    </button>
  );
}
