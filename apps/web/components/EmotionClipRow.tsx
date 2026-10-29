'use client';
// Select-board preview for the burst library. Tap plays a clip file.
// No live TTS, no VRM. Universal switches the folder, not the chat language.

import { useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import { previewEmotionClip, previewLibraryClip } from '../lib/voice';
import {
  BURST_CLIP_KINDS,
  CLIP_LIBRARY,
  clipButtonLabel,
  type BurstClipKind,
  type ClipFolder,
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
  const [universal, setUniversal] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const folder: ClipFolder = universal ? 'universal' : lang;
  const files = CLIP_LIBRARY[folder][gender];

  const onTap = (file: string) => {
    setPlaying(file);
    const stem = file.replace(/\.mp3$/, '');
    if (!universal && (BURST_CLIP_KINDS as readonly string[]).includes(stem)) {
      previewEmotionClip(lang, gender, stem as BurstClipKind);
      return;
    }
    previewLibraryClip(folder, gender, file, lang);
  };

  return (
    <section className="pointer-events-auto w-full min-w-0" data-testid="emotion-clip-row">
      <div className="mb-1 flex items-center justify-center gap-2">
        <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          {t(lang, 'previewReactions')}
        </h2>
        <button
          type="button"
          aria-pressed={universal}
          onClick={() => { setUniversal((on) => !on); setPlaying(null); }}
          className="fx-press rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
        >
          {t(lang, 'previewUniversal')}
        </button>
      </div>
      <div className="flex w-full flex-wrap justify-center gap-1">
        {files.map((file) => {
          const selected = playing === file;
          const label = clipButtonLabel(lang, file);
          return (
            <button
              key={file}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onTap(file)}
              className={`fx-press ui-btn shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
              }`}
              style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
