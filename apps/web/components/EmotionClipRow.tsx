'use client';
// Select-board preview for the burst library. Tap plays a clip file.
// Numbers are CLIP_LIBRARY order (yue→zh→ja→en→universal × F→M), not path sort.
// No live TTS, no VRM. Universal switches the folder, not the chat language.

import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import { saveEmotionClip } from '../lib/emotion-clip-picks';
import { previewEmotionClip, previewLibraryClip } from '../lib/voice';
import { isDevMode, devMark } from '../lib/dev-mode';
import {
  BURST_CLIP_KINDS,
  CLIP_LIBRARY,
  clipButtonLabel,
  clipLibraryIdFor,
  type BurstClipKind,
  type ClipFolder,
} from '../lib/voice-clips';

export default function EmotionClipRow({
  lang,
  gender,
  accent,
  characterId,
}: {
  lang: Lang;
  gender: 'female' | 'male';
  accent: string;
  characterId: string;
}) {
  const [universal, setUniversal] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [showDev, setShowDev] = useState(false);
  useEffect(() => { setShowDev(isDevMode()); }, []);
  const folder: ClipFolder = universal ? 'universal' : lang;
  const files = CLIP_LIBRARY[folder][gender];

  const onTap = (file: string) => {
    setPlaying(file);
    saveEmotionClip(characterId, folder, gender, file);
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
          data-dev={showDev ? 'R0' : undefined}
          onClick={() => { setUniversal((on) => !on); setPlaying(null); }}
          className="fx-press relative rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
        >
          {t(lang, 'previewUniversal')}
        </button>
      </div>
      <div className="flex max-h-24 w-full flex-wrap justify-center gap-1 overflow-y-auto overscroll-contain sm:max-h-none">
        {files.map((file) => {
          const selected = playing === file;
          const clipId = clipLibraryIdFor(folder, gender, file);
          const label = clipButtonLabel(lang, file);
          const mark = clipId ? devMark('R', clipId) : undefined;
          return (
            <button
              key={file}
              type="button"
              aria-label={clipId ? `#${clipId} ${label}` : label}
              aria-pressed={selected}
              title={clipId ? `CLIP #${clipId}` : label}
              data-dev={showDev ? mark : undefined}
              onClick={() => onTap(file)}
              className={`fx-press ui-btn relative shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
              }`}
              style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              {showDev && clipId ? `#${clipId} ${label}` : label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
