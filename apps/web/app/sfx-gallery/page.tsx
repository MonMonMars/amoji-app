'use client';
// In-app CMA00304–CMA00349 Reaction SFX gallery (pre-wire).
// Play each clip, Want / Skip / Clear. Picks persist in localStorage.
// Does NOT wire into poke / laugh / loading production paths.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  cmaReactionPath,
  cmaReactionVerdict,
  forgetCmaReactionPickCache,
  listCmaReactionPicks,
  missingCmaReactionCodes,
  resetCmaReactionPicks,
  setCmaReactionVerdict,
  skippedCmaReactionCodes,
  wantedCmaReactionCodes,
  type CmaReactionClip,
  type CmaReactionVerdict,
} from '../../lib/cma-reaction-gallery';

type Filter = 'all' | 'undecided' | 'want' | 'skip' | 'female' | 'male';

function playClip(path: string, audioRef: { current: HTMLAudioElement | null }) {
  try {
    audioRef.current?.pause();
  } catch { /* ignore */ }
  const a = new Audio(path);
  audioRef.current = a;
  void a.play().catch(() => undefined);
}

function ClipCard({
  clip,
  verdict,
  playing,
  onPlay,
  onWant,
  onSkip,
  onClear,
}: {
  clip: CmaReactionClip;
  verdict: CmaReactionVerdict;
  playing: boolean;
  onPlay: () => void;
  onWant: () => void;
  onSkip: () => void;
  onClear: () => void;
}) {
  const border =
    verdict === 'want'
      ? 'border-emerald-400/70 bg-emerald-500/10'
      : verdict === 'skip'
        ? 'border-rose-400/40 bg-rose-500/5'
        : 'border-white/15 bg-black/35';
  return (
    <article
      data-testid={`cma-card-${clip.code}`}
      data-verdict={verdict}
      className={`rounded-xl border p-3 text-white shadow-sm ${border}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-semibold tracking-wide">{clip.code}</h2>
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
          {clip.burst} · {clip.gender}
        </span>
      </div>
      <p className="mb-1 truncate text-[11px] text-white/55" title={clip.file}>{clip.file}</p>
      <p className="mb-3 text-[10px] text-white/45">
        {clip.license} · {clip.source}
        {clip.durationSec ? ` · ${clip.durationSec.toFixed(2)}s` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid={`cma-play-${clip.code}`}
          onClick={onPlay}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            playing ? 'border-white/80 bg-white/20 text-white' : 'border-white/25 bg-black/40 text-white/85'
          }`}
        >
          {playing ? 'Playing…' : 'Play'}
        </button>
        <button
          type="button"
          data-testid={`cma-want-${clip.code}`}
          aria-pressed={verdict === 'want'}
          onClick={onWant}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            verdict === 'want'
              ? 'border-emerald-300 bg-emerald-500/30 text-white'
              : 'border-white/25 bg-black/40 text-white/85'
          }`}
        >
          Want
        </button>
        <button
          type="button"
          data-testid={`cma-skip-${clip.code}`}
          aria-pressed={verdict === 'skip'}
          onClick={onSkip}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            verdict === 'skip'
              ? 'border-rose-300 bg-rose-500/25 text-white'
              : 'border-white/25 bg-black/40 text-white/85'
          }`}
        >
          Skip
        </button>
        {verdict !== 'undecided' ? (
          <button
            type="button"
            data-testid={`cma-clear-${clip.code}`}
            onClick={onClear}
            className="rounded-full border border-white/15 bg-transparent px-2 py-1 text-[10px] text-white/60"
          >
            Clear
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function SfxGalleryPage() {
  const [picks, setPicks] = useState<Record<string, CmaReactionVerdict>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [playing, setPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const missing = useMemo(() => missingCmaReactionCodes(), []);

  useEffect(() => {
    forgetCmaReactionPickCache();
    setPicks(listCmaReactionPicks());
  }, []);

  const refresh = () => setPicks(listCmaReactionPicks());

  const visible = useMemo(() => {
    return CMA_REACTION_GALLERY.filter((c) => {
      const v = picks[c.code] ?? 'undecided';
      if (filter === 'want') return v === 'want';
      if (filter === 'skip') return v === 'skip';
      if (filter === 'undecided') return v === 'undecided';
      if (filter === 'female') return c.gender === 'female';
      if (filter === 'male') return c.gender === 'male';
      return true;
    });
  }, [filter, picks]);

  const wanted = wantedCmaReactionCodes();
  const skipped = skippedCmaReactionCodes();
  const undecided = CMA_REACTION_GALLERY.length - wanted.length - skipped.length;

  const exportJson = () => {
    const payload = {
      key: CMA_REACTION_GALLERY_KEY,
      note: 'pre-wire selection only — not applied to production reaction paths',
      range: 'CMA00304–CMA00349',
      wanted,
      skipped,
      picks: listCmaReactionPicks(),
      exportedAt: new Date().toISOString(),
    };
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${CMA_REACTION_GALLERY.length})` },
    { id: 'undecided', label: `Undecided (${undecided})` },
    { id: 'want', label: `Want (${wanted.length})` },
    { id: 'skip', label: `Skip (${skipped.length})` },
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
  ];

  return (
    <main className="min-h-screen bg-[#0b0d12] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/90">
            Selection only · not wired yet
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Reaction SFX gallery</h1>
          <p className="max-w-2xl text-sm text-white/65">
            CMA00304–CMA00349 ({CMA_REACTION_GALLERY.length} clips present
            {missing.length ? `, ${missing.length} missing` : ', 0 missing'}). Play each clip, then
            Want or Skip. Picks stay in localStorage (<code className="text-white/80">{CMA_REACTION_GALLERY_KEY}</code>).
            Production poke / laugh / loading paths are unchanged until a later wire PR.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="/select" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10">← Select</a>
            <a href="/chat" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10">Chat</a>
            <button
              type="button"
              data-testid="cma-export"
              onClick={exportJson}
              className="rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs text-sky-100"
            >
              {copied ? 'Copied picks JSON' : 'Copy Want/Skip JSON'}
            </button>
            <button
              type="button"
              data-testid="cma-reset"
              onClick={() => { resetCmaReactionPicks(); refresh(); }}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/55"
            >
              Reset picks
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Gallery filters">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === f.id
                  ? 'border-white/70 bg-white/15 text-white'
                  : 'border-white/15 bg-black/30 text-white/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="cma-gallery-grid">
          {visible.map((clip) => {
            const verdict = (picks[clip.code] ?? cmaReactionVerdict(clip.code)) as CmaReactionVerdict;
            return (
              <ClipCard
                key={clip.code}
                clip={clip}
                verdict={verdict}
                playing={playing === clip.code}
                onPlay={() => {
                  setPlaying(clip.code);
                  playClip(cmaReactionPath(clip.file), audioRef);
                }}
                onWant={() => {
                  setCmaReactionVerdict(clip.code, 'want');
                  refresh();
                }}
                onSkip={() => {
                  setCmaReactionVerdict(clip.code, 'skip');
                  refresh();
                }}
                onClear={() => {
                  setCmaReactionVerdict(clip.code, 'undecided');
                  refresh();
                }}
              />
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="mt-8 text-center text-sm text-white/50">No clips in this filter.</p>
        ) : null}
      </div>
    </main>
  );
}
