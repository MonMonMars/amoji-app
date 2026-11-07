'use client';
// Select-board reaction preview: NEWER CMA00304–CMA00349 set only (Mon).
// Numbers = gallery order for Mon assignment. Want/Skip on /sfx-gallery.
// Tap previews only (mute-aware Audio); does not auto-Want.

import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import { isDevMode, devMark } from '../lib/dev-mode';
import {
  CMA_REACTION_GALLERY,
  cmaReactionPath,
  type CmaReactionClip,
} from '../lib/cma-reaction-gallery';

export default function EmotionClipRow({
  lang,
  gender,
  accent,
  characterId: _characterId,
}: {
  lang: Lang;
  gender: 'female' | 'male';
  accent: string;
  characterId: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [showDev, setShowDev] = useState(false);
  useEffect(() => { setShowDev(isDevMode()); }, []);

  // Prefer matching companion gender; still show the other group below so Mon can assign.
  const ordered: CmaReactionClip[] = [
    ...CMA_REACTION_GALLERY.filter((c) => c.gender === gender),
    ...CMA_REACTION_GALLERY.filter((c) => c.gender !== gender),
  ];

  const onTap = (clip: CmaReactionClip) => {
    // Exclusive single-select: only the tapped CMA clip stays pressed.
    setPlaying(clip.code);
    try {
      const a = new Audio(cmaReactionPath(clip.file));
      void a.play().catch(() => { /* ignore autoplay */ });
    } catch { /* ignore */ }
  };

  return (
    <section role="group" aria-labelledby="amoji-emotion-clip-title" className="pointer-events-auto w-full min-w-0" data-testid="emotion-clip-row">
      <div className="mb-1 flex items-center justify-center gap-2">
        <h2 id="amoji-emotion-clip-title" className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          {t(lang, 'previewReactions')}
        </h2>
      </div>
      <div className="max-h-28 w-full overflow-y-auto overscroll-contain sm:max-h-36">
        <div className="grid w-full grid-cols-2 gap-1 min-[420px]:grid-cols-3 sm:grid-cols-4">
          {ordered.map((clip, i) => {
            const n = i + 1;
            const selected = playing === clip.code;
            const label = `#${n} ${clip.burst} (${clip.gender[0]})`;
            const mark = showDev ? devMark('R', n) : undefined;
            return (
              <button
                key={clip.code}
                type="button"
                aria-label={`${label} ${clip.code}`}
                aria-pressed={selected}
                title={`${clip.code} · ${clip.file}`}
                data-cma-code={clip.code}
                data-reaction-n={n}
                data-dev={mark}
                onClick={() => onTap(clip)}
                className={`fx-press ui-btn relative min-h-9 rounded-xl border px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${
                  selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
                }`}
                style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                {showDev && mark ? `${mark} ${label}` : label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
