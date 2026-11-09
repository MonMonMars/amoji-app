'use client';
// Settings → Voice → TTS Lab: click each engine to audition (or open its demo).

import { useState } from 'react';
import { TTS_LAB_ENGINES, type TtsLabEngine } from '../lib/tts-lab';
import { auditionTtsLabEngine } from '../lib/tts-lab-audition';
import { t, type Lang } from '../lib/prefs';

function statusTone(status: TtsLabEngine['status']): string {
  if (status === 'works') return 'border-emerald-400/40 text-emerald-100/90';
  if (status === 'browser') return 'border-sky-400/40 text-sky-100/90';
  if (status === 'dead') return 'border-rose-400/35 text-rose-100/80';
  if (status === 'gated') return 'border-amber-400/35 text-amber-100/85';
  if (status === 'external-demo') return 'border-violet-400/35 text-violet-100/85';
  return 'border-white/15 text-white/70';
}

function statusLabel(lang: Lang, status: TtsLabEngine['status']): string {
  if (status === 'works') return t(lang, 'ttsLabStatusWorks');
  if (status === 'browser') return t(lang, 'ttsLabStatusBrowser');
  if (status === 'dead') return t(lang, 'ttsLabStatusDead');
  if (status === 'gated') return t(lang, 'ttsLabStatusGated');
  if (status === 'external-demo') return t(lang, 'ttsLabStatusDemo');
  return t(lang, 'ttsLabStatusMissing');
}

export default function TtsLabPanel({ lang, accent }: { lang: Lang; accent: string }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');

  const onTap = async (engine: TtsLabEngine) => {
    if (busyId) return;
    setBusyId(engine.id);
    setNote('');
    try {
      const result = await auditionTtsLabEngine(engine.id, lang);
      if (result.ok) {
        setNote(`${engine.name}: ${t(lang, 'ttsLabPlayed')} (${result.via})`);
      } else {
        setNote(`${engine.name}: ${result.reason}`);
        if (result.demoUrl && (engine.audition === 'external' || engine.audition === 'gated' || engine.audition === 'canto-nano')) {
          try {
            window.open(result.demoUrl, '_blank', 'noopener,noreferrer');
          } catch { /* ignore */ }
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2" data-testid="tts-lab-panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-left"
        data-testid="tts-lab-toggle"
      >
        <span className="block text-[12px] font-medium text-white/90">{t(lang, 'ttsLabTitle')}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-white/45">{t(lang, 'ttsLabHint')}</span>
      </button>
      {open && (
        <div className="space-y-1.5" data-testid="tts-lab-list">
          {TTS_LAB_ENGINES.map((engine) => {
            const live = busyId === engine.id;
            return (
              <button
                key={engine.id}
                type="button"
                data-tts-lab-id={engine.id}
                disabled={!!busyId}
                onClick={() => void onTap(engine)}
                className={`ui-btn w-full rounded-xl border px-2.5 py-2 text-left ${statusTone(engine.status)} ${
                  live ? 'opacity-90' : 'bg-black/20 hover:bg-black/35'
                }`}
                style={live ? { boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-white/95">{engine.name}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-white/55">{engine.blurb}</span>
                    <span className="mt-1 block text-[10px] text-white/40">
                      {statusLabel(lang, engine.status)} · yue:{engine.yue} · {engine.costNote}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/80">
                    {live ? '…' : t(lang, 'ttsLabPlay')}
                  </span>
                </span>
              </button>
            );
          })}
          {note && (
            <p role="status" className="px-1 text-[10px] leading-relaxed text-white/55" data-testid="tts-lab-note">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
