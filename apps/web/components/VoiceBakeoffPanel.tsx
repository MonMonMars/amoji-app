'use client';

import { useMemo, useState } from 'react';
import type { Prefs } from '../lib/prefs';
import {
  BAKEOFF_PHRASES,
  bakeoffEngines,
  runBakeoffMic,
  runBakeoffTts,
  stopAllBakeoff,
  type BakeoffEngineId,
} from '../lib/voice-bakeoff';
import {
  azureSpeechKey,
  azureSpeechRegion,
  setAzureSpeechKey,
  setAzureSpeechRegion,
} from '../lib/azure-speech';
import { primeSynthInGesture } from '../lib/voice';

export default function VoiceBakeoffPanel({ prefs, accent }: { prefs: Prefs; accent: string }) {
  const lang = prefs.lang;
  const phrases = BAKEOFF_PHRASES[lang] ?? BAKEOFF_PHRASES.en;
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [activeEngine, setActiveEngine] = useState<BakeoffEngineId>('edge');
  const [status, setStatus] = useState<Record<BakeoffEngineId, string>>({} as Record<BakeoffEngineId, string>);
  const [busy, setBusy] = useState<BakeoffEngineId | 'mic' | null>(null);
  const [azureKeyDraft, setAzureKeyDraft] = useState(() => azureSpeechKey());
  const [azureRegionDraft, setAzureRegionDraft] = useState(() => azureSpeechRegion());
  const [azureConfigTick, setAzureConfigTick] = useState(0);
  const [micResult, setMicResult] = useState<string | null>(null);

  const engines = useMemo(() => bakeoffEngines(), [azureConfigTick]);

  const sampleText = phrases[phraseIdx] ?? phrases[0]!;

  const primeGesture = () => {
    try {
      primeSynthInGesture();
      const probe = new SpeechSynthesisUtterance(' ');
      probe.volume = 0;
      probe.rate = 2;
      window.speechSynthesis?.speak(probe);
    } catch { /* best-effort */ }
  };

  const playEngine = (id: BakeoffEngineId) => {
    primeGesture();
    setActiveEngine(id);
    setBusy(id);
    setStatus((s) => ({ ...s, [id]: '…' }));
    void runBakeoffTts(id, sampleText, prefs.character, lang).then((res) => {
      setBusy(null);
      setStatus((s) => ({ ...s, [id]: res.ok ? `✓ ${res.detail}` : `✗ ${res.detail}` }));
    });
  };

  const runMic = () => {
    primeGesture();
    setBusy('mic');
    setMicResult(null);
    void runBakeoffMic(lang).then((res) => {
      setBusy(null);
      setMicResult(res.ok ? `✓ ${res.detail}` : `✗ ${res.detail}`);
      if (res.ok && res.detail && res.detail !== '(empty)') {
        const engine = engines.find((e) => e.id === activeEngine && e.enabled);
        if (engine) {
          void runBakeoffTts(activeEngine, res.detail, prefs.character, lang);
        }
      }
    });
  };

  const saveAzure = () => {
    setAzureSpeechKey(azureKeyDraft);
    setAzureSpeechRegion(azureRegionDraft);
    setAzureConfigTick((n) => n + 1);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div>
        <p className="text-sm font-medium text-white/90">🎚️ Voice bake-off</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          Compare free TTS engines side by side. Production chat still uses the full chain
          (edge-tts → gTTS → browser). Nothing here replaces that path.
        </p>
      </div>

      <label className="block text-[11px] text-white/50">Sample phrase</label>
      <select
        value={phraseIdx}
        onChange={(e) => setPhraseIdx(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 outline-none focus:border-white/25"
      >
        {phrases.map((p, i) => (
          <option key={i} value={i} className="bg-neutral-900">
            {p.length > 48 ? `${p.slice(0, 48)}…` : p}
          </option>
        ))}
      </select>
      <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/70">
        {sampleText}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { stopAllBakeoff(); setBusy(null); }}
          className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70"
        >
          Stop all
        </button>
        <button
          type="button"
          disabled={busy === 'mic'}
          onClick={runMic}
          className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/90 disabled:opacity-40"
          style={{ backgroundColor: `${accent}2e` }}
        >
          {busy === 'mic' ? '🎤 Listening…' : '🎤 Mic (Web Speech STT)'}
        </button>
      </div>
      {micResult && (
        <p className="text-[10px] text-white/55">STT: {micResult}</p>
      )}
      <p className="text-[10px] text-white/35">
        After STT succeeds, the active engine echoes what you said (round-trip).
      </p>

      <div className="space-y-2.5">
        {engines.map((eng) => {
          const selected = activeEngine === eng.id;
          return (
            <div
              key={eng.id}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${selected ? 'border-white/25 bg-white/8' : 'border-white/10 bg-white/5'} ${!eng.enabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveEngine(eng.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="text-xs font-medium text-white/90">{eng.name}</span>
                  <span className="mt-0.5 block text-[10px] text-emerald-200/80">{eng.costNote}</span>
                </button>
                <button
                  type="button"
                  disabled={!eng.enabled || busy !== null}
                  onClick={() => playEngine(eng.id)}
                  className="ui-btn shrink-0 rounded-full px-3 py-1 text-[11px] text-white/90 disabled:opacity-40"
                  style={{ backgroundColor: `${accent}33` }}
                >
                  {busy === eng.id ? '…' : '▶ Play'}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/50">
                <span className="text-white/40">Canto: </span>{eng.cantoNote}
              </p>
              <p className="text-[10px] text-white/40">
                Latency: {eng.latencyNote}
                {eng.sttAvailable ? ' · STT bundled' : ''}
              </p>
              {!eng.enabled && eng.disabledReason && (
                <p className="mt-1 text-[10px] text-amber-200/80">{eng.disabledReason}</p>
              )}
              {status[eng.id] && (
                <p className="mt-1 text-[10px] text-white/55">{status[eng.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5 border-t border-white/10 pt-3">
        <p className="text-[11px] font-medium text-white/60">Azure Speech (optional)</p>
        <p className="text-[10px] leading-relaxed text-white/40">
          Free F0:{' '}
          <a
            href="https://azure.microsoft.com/free/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-white/55"
          >
            azure.microsoft.com/free
          </a>
          {' '}→ create a Speech resource → paste key + region (e.g. eastasia). Or set{' '}
          <code className="text-white/50">NEXT_PUBLIC_AZURE_SPEECH_KEY</code> at build time.
        </p>
        <input
          type="password"
          autoComplete="off"
          value={azureKeyDraft}
          onChange={(e) => setAzureKeyDraft(e.target.value)}
          placeholder="Azure Speech subscription key"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 outline-none placeholder:text-white/30"
        />
        <input
          value={azureRegionDraft}
          onChange={(e) => setAzureRegionDraft(e.target.value)}
          placeholder="Region (e.g. eastasia)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 outline-none placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={saveAzure}
          className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/90"
          style={{ backgroundColor: `${accent}2e` }}
        >
          Save Azure key (this device only)
        </button>
      </div>
    </div>
  );
}
