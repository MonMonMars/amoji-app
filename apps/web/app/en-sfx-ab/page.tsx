"use client";
// EN emotion/SFX sidecar A/B test page (Mon Path B).
// Distinct buttons per engine. Edge baseline; sidecars fail-closed.
// Does NOT touch Yue/ja Edge chat. Does NOT wire CMA Wanted.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  EN_SFX_AB_SAMPLES,
  EN_SFX_SIDECAR_ENGINES,
  enSfxFailClosedMessage,
  enSfxGatewayBase,
  enSfxGatewayStatus,
  readEnSfxAbPick,
  writeEnSfxAbPick,
  type EnSfxSidecarEngineId,
} from '../../lib/en-sfx-sidecar';
import { edgeSampleText } from '../../lib/voice-catalog';
import { speak } from '../../lib/voice';

type HealthEngine = {
  engine: string;
  ready?: boolean;
  skipped?: boolean;
  venv?: boolean;
  sample_wav?: boolean;
};

type Health = {
  ok?: boolean;
  engines?: Record<string, HealthEngine>;
  error?: string;
};

export default function EnSfxAbPage() {
  const [pick, setPick] = useState<EnSfxSidecarEngineId>('edge');
  const [sampleId, setSampleId] = useState(EN_SFX_AB_SAMPLES[0]?.id ?? 'laugh');
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gateway = useMemo(() => enSfxGatewayBase(), []);
  const gatewayPill = useMemo(() => enSfxGatewayStatus(health), [health]);

  useEffect(() => {
    setPick(readEnSfxAbPick());
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch(`${gateway}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Health;
      setHealth(json);
      setStatus('Gateway reachable');
    } catch (e) {
      setHealth({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setStatus('Gateway offline — sidecars fail-closed to Edge');
    }
  }, [gateway]);

  useEffect(() => {
    void refreshHealth();
    const t = window.setInterval(() => void refreshHealth(), 8000);
    return () => window.clearInterval(t);
  }, [refreshHealth]);

  const onPick = (id: EnSfxSidecarEngineId) => {
    setPick(id);
    writeEnSfxAbPick(id);
  };

  const sample = EN_SFX_AB_SAMPLES.find((s) => s.id === sampleId) ?? EN_SFX_AB_SAMPLES[0];

  const playBlob = async (blob: Blob) => {
    try {
      audioRef.current?.pause();
    } catch {
      /* ignore */
    }
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => URL.revokeObjectURL(url);
    await a.play();
  };

  const edgeFallback = (text: string) => {
    const cleaned = text.replace(/\[[^\]]+\]/g, '').replace(/\([^)]+\)/g, '').trim();
    speak(cleaned || edgeSampleText('en'), 'a01-shino', 'en');
  };

  const onPreview = async () => {
    if (!sample) return;
    setBusy(true);
    setStatus(`Preview ${pick}…`);
    try {
      if (pick === 'edge') {
        speak(edgeSampleText('en'), 'a01-shino', 'en');
        setStatus('Played Edge baseline');
        return;
      }
      const res = await fetch(`${gateway}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: pick, text: sample.text }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string; hint?: string };
          detail = j.error || j.hint || detail;
        } catch {
          /* ignore */
        }
        setStatus(enSfxFailClosedMessage({ engineId: pick, detail, engineHealth: health?.engines?.[pick] }));
        edgeFallback(sample.text);
        return;
      }
      const blob = await res.blob();
      await playBlob(blob);
      const eng = res.headers.get('X-Amoji-Engine') || pick;
      const samp = res.headers.get('X-Amoji-Sample') || '';
      setStatus(`Played ${eng}${samp ? ` (${samp})` : ''}`);
    } catch (e) {
      setStatus(enSfxFailClosedMessage({ engineId: pick, detail: e instanceof Error ? e.message : String(e), engineHealth: health?.engines?.[pick] }));
      try {
        edgeFallback(sample.text);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white" data-testid="en-sfx-ab-page">
      <nav className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link href="/select" className="rounded-full border border-white/20 px-3 py-1 text-white/80 hover:bg-white/10">← Select</Link>
        <Link href="/sfx-gallery" className="rounded-full border border-white/20 px-3 py-1 text-white/80 hover:bg-white/10" data-testid="link-sfx-gallery">Reaction SFX gallery</Link>
      </nav>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-wide">EN SFX sidecar A/B</h1>
            <p className="text-xs text-white/55">
              Path B test lane — Edge / Yue / ja chat untouched. No EN+Cantonese combine. CMA Wanted not wired here.
            </p>
          </div>
          <Link href="/select" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
            ← Select
          </Link>
        </header>

        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          data-testid="en-sfx-gateway-pill"
          data-state={gatewayPill.state}
        >
          <span
            className={[
              'inline-block h-2.5 w-2.5 rounded-full',
              gatewayPill.state === 'up' ? 'bg-emerald-400' : gatewayPill.state === 'down' ? 'bg-rose-400' : 'bg-amber-300',
            ].join(' ')}
            aria-hidden
          />
          <span className="text-sm font-medium">{gatewayPill.label}</span>
          <span className="text-[11px] text-white/50">{gatewayPill.detail}</span>
          {pick !== 'edge' && health?.engines?.[pick]?.skipped ? (
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100" data-testid="en-sfx-engine-skip-hint">
              {pick === 'vui-nano' ? 'Vui CUDA/skip → Edge' : 'Engine SKIP → Edge'}
            </span>
          ) : null}
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/40 p-3">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Voice / engine (tap to A/B)
          </h2>
          <div className="flex flex-wrap gap-2" data-testid="en-sfx-ab-engines">
            {EN_SFX_SIDECAR_ENGINES.map((engine) => {
              const st = health?.engines?.[engine.id];
              const selected = pick === engine.id;
              const ready = engine.id === 'edge' ? true : Boolean(st?.ready);
              const skipped = Boolean(st?.skipped);
              return (
                <button
                  key={engine.id}
                  type="button"
                  data-testid={`en-sfx-engine-${engine.id}`}
                  data-ready={ready ? '1' : '0'}
                  data-skipped={skipped ? '1' : '0'}
                  aria-pressed={selected}
                  onClick={() => onPick(engine.id)}
                  className={[
                    'rounded-xl border px-3 py-2 text-left text-sm transition',
                    selected
                      ? 'border-emerald-400/80 bg-emerald-500/15'
                      : 'border-white/15 bg-white/5 hover:border-white/35',
                  ].join(' ')}
                >
                  <div className="font-medium">{engine.label}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-white/50">
                    <span className="rounded bg-white/10 px-1.5 py-0.5">{engine.badge}</span>
                    {engine.id !== 'edge' && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5">
                        {skipped ? 'SKIP' : ready ? 'ready' : 'offline'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/40 p-3">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Sample line
          </h2>
          <div className="flex flex-wrap gap-2" data-testid="en-sfx-ab-samples">
            {EN_SFX_AB_SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                data-testid={`en-sfx-sample-${s.id}`}
                aria-pressed={sampleId === s.id}
                onClick={() => setSampleId(s.id)}
                className={[
                  'rounded-full border px-3 py-1 text-xs',
                  sampleId === s.id ? 'border-sky-400/70 bg-sky-500/15' : 'border-white/15 bg-white/5',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white/80">{sample?.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="en-sfx-ab-preview"
              disabled={busy}
              onClick={() => void onPreview()}
              className="rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {busy ? 'Playing…' : 'Preview selected engine'}
            </button>
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/70"
            >
              Refresh gateway
            </button>
          </div>
          <p className="mt-2 text-xs text-white/55" data-testid="en-sfx-ab-status">
            {status}
          </p>
          <p className="mt-1 text-[10px] text-white/40">
            Gateway: {gateway} — run <code>tools/en-sfx-gateway/run-gateway.ps1</code> on DESKTOP. Flags default off;
            weights on D: HF cache only.
          </p>
        </section>
      </div>
    </main>
  );
}