'use client';
// Select-board poke/reaction SFX: Mon keepers + poke CMA00350–366.
// Numbers = gender-first gallery order (female clips first on female companions).
// Tap cycles Want → Skip → undecided (same picks as /sfx-gallery). Wanted poke
// clips feed recordedPokeClip; empty Want = full poke list minus Skip.

import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import { isDevMode, devMark } from '../lib/dev-mode';
import { voiceOutputAllowed } from '../lib/voice';
import {
  CMA_REACTION_GALLERY,
  cmaReactionPath,
  cmaReactionVerdict,
  forgetCmaReactionPickCache,
  listCmaReactionPicks,
  setCmaReactionVerdict,
  type CmaReactionClip,
  type CmaReactionVerdict,
} from '../lib/cma-reaction-gallery';

function nextVerdict(cur: CmaReactionVerdict): CmaReactionVerdict {
  if (cur === 'undecided') return 'want';
  if (cur === 'want') return 'skip';
  return 'undecided';
}

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
  const [picks, setPicks] = useState<Record<string, CmaReactionVerdict>>({});
  const [showDev, setShowDev] = useState(false);
  useEffect(() => { setShowDev(isDevMode()); }, []);
  useEffect(() => {
    forgetCmaReactionPickCache();
    setPicks(listCmaReactionPicks());
  }, []);

  // Prefer matching companion gender; still show the other group below so Mon can assign.
  const ordered: CmaReactionClip[] = [
    ...CMA_REACTION_GALLERY.filter((c) => c.gender === gender),
    ...CMA_REACTION_GALLERY.filter((c) => c.gender !== gender),
  ];

  const onTap = (clip: CmaReactionClip) => {
    if (!voiceOutputAllowed()) return;
    const cur = (picks[clip.code] ?? cmaReactionVerdict(clip.code)) as CmaReactionVerdict;
    const next = nextVerdict(cur);
    setCmaReactionVerdict(clip.code, next);
    setPicks(listCmaReactionPicks());
    setPlaying(clip.code);
    if (next === 'skip') return;
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
      <p className="mb-1.5 text-center text-[10px] text-white/45" data-testid="emotion-clip-pick-hint">
        Tap: Want → Skip → clear · Wanted poke SFX play on poke
      </p>
      {/* Full numbered set, no inner scroll: the select board is the only
          vertical scroller on the page (Mon). */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 gap-1 min-[420px]:grid-cols-3 sm:grid-cols-4">
          {ordered.map((clip, i) => {
            const n = i + 1;
            const verdict = (picks[clip.code] ?? cmaReactionVerdict(clip.code)) as CmaReactionVerdict;
            const wanted = verdict === 'want';
            const skipped = verdict === 'skip';
            const auditioning = playing === clip.code;
            const label = `#${n} ${clip.burst} (${clip.gender[0]})`;
            const mark = showDev ? devMark('R', n) : undefined;
            const badge = wanted ? 'Want' : skipped ? 'Skip' : null;
            return (
              <button
                key={clip.code}
                type="button"
                aria-label={`${label} ${clip.code}${badge ? ` ${badge}` : ''}`}
                aria-pressed={wanted}
                title={`${clip.code} · ${clip.file} · ${verdict}`}
                data-cma-code={clip.code}
                data-reaction-n={n}
                data-verdict={verdict}
                data-dev={mark}
                onClick={() => onTap(clip)}
                className={`fx-press ui-btn relative min-h-9 rounded-xl border px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${
                  wanted
                    ? 'border-white/80 text-white'
                    : skipped
                      ? 'border-white/10 bg-black/25 text-white/40 line-through'
                      : 'border-white/15 bg-black/35 text-white/80'
                } ${auditioning && !wanted ? 'ring-1 ring-white/40' : ''}`}
                style={wanted ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                {showDev && mark ? `${mark} ${label}` : label}
                {badge ? (
                  <span className="ml-1 text-[9px] uppercase tracking-wide opacity-80">{badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
