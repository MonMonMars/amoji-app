'use client';
// Select-board preview for recorded emotion bursts. Tap plays the clip for
// the current language and the companion's gender. No TTS, no VRM.

import { useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import { previewEmotionClip } from '../lib/voice';
import {
  BURST_CLIP_KINDS,
  BURST_CLIP_LABEL,
  clipLang,
  type BurstClipKind,
} from '../lib/voice-clips';

export default function EmotionClipRow({
  lang,
  gender,
  accent,
}: {
  lang: Lang;
  gender: 'female' | 'male';
  accent: string;
}) {
  const [playing, setPlaying] = useState<BurstClipKind | null>(null);
  const labels = BURST_CLIP_LABEL[clipLang(lang)];

  const onTap = (kind: BurstClipKind) => {
    setPlaying(kind);
    previewEmotionClip(lang, gender, kind);
  };

  return (
    <section className="pointer-events-auto w-full min-w-0" data-testid="emotion-clip-row">
      <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
        {t(lang, 'previewReactions')}
      </h2>
      <div className="flex w-full flex-wrap justify-center gap-1">
        {BURST_CLIP_KINDS.map((kind) => {
          const selected = playing === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-label={labels[kind]}
              aria-pressed={selected}
              onClick={() => onTap(kind)}
              className={`fx-press ui-btn shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
              }`}
              style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              {labels[kind]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
