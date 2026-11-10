"use client";
// In-app CMA00304-CMA00349 Reaction SFX gallery (minus dropped female-view #1–11).
// Wanted picks feed recordedLaughClip / recordedPokeClip at play time. Skip stays out.
// Play each clip, Want / Skip / Clear. Picks persist in localStorage.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { loadPrefs } from '../../lib/prefs';
import {
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  clearSkippedCmaReactionPicks,
  cmaReactionPath,
  cmaReactionVerdict,
  countCmaReactionPicks,
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
  void a.play().catch((err) => {
    console.warn('[sfx-gallery] play failed', path, err);
  });
}

function ClipCard({
  clip,
  verdict,
  playing,
  focused,
  onPlay,
  onWant,
  onSkip,
  onClear,
  onFocusCard,
}: {
  clip: CmaReactionClip;
  verdict: CmaReactionVerdict;
  playing: boolean;
  focused: boolean;
  onPlay: () => void;
  onWant: () => void;
  onSkip: () => void;
  onClear: () => void;
  onFocusCard: () => void;
}) {
  const border =
    verdict === 'want'
      ? 'border-emerald-400/70 bg-emerald-500/10'
      : verdict === 'skip'
        ? 'border-rose-400/40 bg-rose-500/5'
        : 'border-white/15 bg-black/35';
  const ring = focused ? 'ring-2 ring-amber-300/80' : '';
  return (
    <article
      data-testid={`cma-card-${clip.code}`}
      data-verdict={verdict}
      data-focused={focused ? '1' : '0'}
      onClick={onFocusCard}
      className={`rounded-xl border p-3 text-white shadow-sm ${border} ${ring}`}
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
          aria-label={`Play ${clip.code}`}
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
          aria-label={`Want ${clip.code}`}
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
          aria-label={`Skip ${clip.code}`}
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
            aria-label={`Clear ${clip.code}`}
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
  const [focusIdx, setFocusIdx] = useState(0);
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
  const counts = countCmaReactionPicks(picks);
  const undecided = counts.undecided;

  useEffect(() => {
    if (visible.length === 0) {
      setFocusIdx(0);
      return;
    }
    setFocusIdx((i) => Math.min(Math.max(0, i), visible.length - 1));
  }, [visible.length, filter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!visible.length) return;
      const clip = visible[focusIdx];
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => (i + 1) % visible.length);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => (i - 1 + visible.length) % visible.length);
        return;
      }
      if (!clip) return;
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setCmaReactionVerdict(clip.code, 'want');
        setPlaying(clip.code);
        playClip(cmaReactionPath(clip.file), audioRef);
        refresh();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setCmaReactionVerdict(clip.code, 'skip');
        refresh();
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        if (e.key === ' ' && t && t.tagName === 'BUTTON') return;
        e.preventDefault();
        setPlaying(clip.code);
        playClip(cmaReactionPath(clip.file), audioRef);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, focusIdx]);

  const exportJson = () => {
    const payload = {
      key: CMA_REACTION_GALLERY_KEY,
      note: 'Wanted codes feed laugh/poke play pools; Skip never enters',
      range: 'CMA00304-CMA00349 (minus dropped female-view #1–11)',
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

  const onClearSkipped = () => {
    if (skipped.length === 0) return;
    const ok = window.confirm(`Clear ${skipped.length} Skipped pick(s)? Wanted stays.`);
    if (!ok) return;
    clearSkippedCmaReactionPicks();
    refresh();
  };

  const onResetAll = () => {
    const ok = window.confirm('Reset ALL picks (Wanted + Skipped)? This cannot be undone.');
    if (!ok) return;
    resetCmaReactionPicks();
    refresh();
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'undecided', label: `Undecided (${undecided})` },
    { id: 'want', label: `Wanted (${wanted.length})` },
    { id: 'skip', label: `Skipped (${skipped.length})` },
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
  ];

  const lang = loadPrefs().lang;
  const backSelect =
    lang === 'yue' ? '返回選擇' : lang === 'zh' ? '返回选择' : lang === 'ja' ? '選択に戻る' : 'Back to select';
  const openChat =
    lang === 'yue' ? '打開傾偈' : lang === 'zh' ? '打开聊天' : lang === 'ja' ? 'チャットを開く' : 'Open chat';
  const copyWantSkip =
    lang === 'yue' ? '複製 Want/Skip JSON' : lang === 'zh' ? '复制 Want/Skip JSON' : lang === 'ja' ? 'Want/Skip JSONをコピー' : 'Copy Want/Skip JSON';
  const clearSkipped =
    lang === 'yue' ? '清除已 Skip' : lang === 'zh' ? '清除已 Skip' : lang === 'ja' ? 'Skip をクリア' : 'Clear skipped picks';
  const resetAll =
    lang === 'yue' ? '重設全部選擇' : lang === 'zh' ? '重置全部选择' : lang === 'ja' ? 'すべての選択をリセット' : 'Reset all picks';

  return (
    <main aria-labelledby="amoji-sfx-gallery-title" className="min-h-screen bg-[#0b0d12] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90">
            Wanted → laugh/poke wire live · Skip stays out
          </p>
          <h1 id="amoji-sfx-gallery-title" className="text-2xl font-semibold tracking-tight">Reaction SFX gallery</h1>
          <p className="max-w-2xl text-sm text-white/65">
            CMA00304-CMA00349 ({CMA_REACTION_GALLERY.length} clips present
            {missing.length ? `, ${missing.length} missing` : ', 0 missing'}). Play each clip, then
            Want or Skip. Picks stay in localStorage (<code className="text-white/80">{CMA_REACTION_GALLERY_KEY}</code>).
            Keyboard: arrows focus · <kbd className="rounded border border-white/20 px-1">W</kbd> Want ·{' '}
            <kbd className="rounded border border-white/20 px-1">S</kbd> Skip ·{' '}
            <kbd className="rounded border border-white/20 px-1">P</kbd>/Space Play.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/select" aria-label={backSelect} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10">← Select</Link>
            <Link href="/chat" aria-label={openChat} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10">Chat</Link>
            <Link href="/en-sfx-ab" className="rounded-full border border-amber-400/40 px-3 py-1 text-xs text-amber-100/90 hover:bg-amber-500/10" data-testid="link-en-sfx-ab">EN SFX A/B (test)</Link>
            <button
              type="button"
              data-testid="cma-export"
              aria-label={copyWantSkip}
              onClick={exportJson}
              className="rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs text-sky-100"
            >
              {copied ? 'Copied picks JSON' : 'Copy Want/Skip JSON'}
            </button>
            <button
              type="button"
              data-testid="cma-clear-skipped"
              aria-label={clearSkipped}
              onClick={onClearSkipped}
              disabled={skipped.length === 0}
              className="rounded-full border border-rose-400/35 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 disabled:opacity-40"
            >
              Clear Skipped ({skipped.length})
            </button>
            <button
              type="button"
              data-testid="cma-reset"
              aria-label={resetAll}
              onClick={onResetAll}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/55"
            >
              Reset all picks
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
              aria-label={f.label}
              data-testid={`cma-filter-${f.id}`}
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
          {visible.map((clip, idx) => {
            const verdict = (picks[clip.code] ?? cmaReactionVerdict(clip.code)) as CmaReactionVerdict;
            return (
              <ClipCard
                key={clip.code}
                clip={clip}
                verdict={verdict}
                playing={playing === clip.code}
                focused={idx === focusIdx}
                onFocusCard={() => setFocusIdx(idx)}
                onPlay={() => {
                  setFocusIdx(idx);
                  setPlaying(clip.code);
                  playClip(cmaReactionPath(clip.file), audioRef);
                }}
                onWant={() => {
                  setFocusIdx(idx);
                  setCmaReactionVerdict(clip.code, 'want');
                  setPlaying(clip.code);
                  playClip(cmaReactionPath(clip.file), audioRef);
                  refresh();
                }}
                onSkip={() => {
                  setFocusIdx(idx);
                  setCmaReactionVerdict(clip.code, 'skip');
                  refresh();
                }}
                onClear={() => {
                  setFocusIdx(idx);
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
