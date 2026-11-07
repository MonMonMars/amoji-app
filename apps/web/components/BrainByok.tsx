'use client';
// Optional bring-your-own API key — the body of Settings → 🧠 Sharper brain.
//
// Why this exists again (r2026-11-08): BYOK was fully implemented in
// lib/brain.ts + streamCompletion(), and then the whole section was deleted
// from Settings on the assumption that the anonymous free lane could carry
// everyone. That assumption stopped being true — the free lane is rate-limited
// and cannot scale — so the only way to get a faster, smarter companion was
// unreachable from the UI. This puts it back.
//
// Design rules, in priority order:
//  1. Never look like setup. The app answers with no key; the copy says so, and
//     a test enforces that no line reads like a required step.
//  2. The key never leaves the device: it goes to `amoji.brain.key.<id>` in
//     localStorage and nowhere else. There is no server hop, no log line and no
//     analytics call — this file has no console.* at all.
//  3. After a save the plaintext key is dropped from React state, so it cannot
//     reappear in the DOM or an accessibility tree. What stays is a
//     "saved on this device" badge. The stored key is never read back into an
//     input, by design.
//  4. "Did I paste it right?" must be answerable in one tap. `Test` makes a real
//     minimal call through the same transport the chat uses and prints the
//     provider's own words when it fails.
import { useState, useSyncExternalStore } from 'react';
import {
  BRAIN_SPECS, brainKey, brainProvider, probeBrain, saveBrainKey, setBrainKey,
  setBrainProvider, type BrainId, type BrainProbeResult, type BrainProvider,
} from '../lib/brain';
import { t, type Lang, type StrKey } from '../lib/prefs';

/** Plain-language allowance per provider (verified 2026-11-08). */
const TIER_KEY: Record<BrainId, StrKey> = {
  deepseek: 'byokTierDeepseek',
  moonshot: 'byokTierMoonshot',
  groq: 'byokTierGroq',
  openrouter: 'byokTierOpenrouter',
  pollinations: 'byokTierPollinations',
};

/** Regional caveats — only the two that were actually verified. */
const REGION_KEY: Partial<Record<BrainId, StrKey>> = {
  groq: 'byokRegionGroq',
  openrouter: 'byokRegionOpenrouter',
};

export const VERDICT_KEY: Record<BrainProbeResult['verdict'], StrKey> = {
  ok: 'byokTestOk',
  nokey: 'byokTestNokey',
  auth: 'byokTestAuth',
  blocked: 'byokTestBlocked',
  model: 'byokTestModel',
  credit: 'byokTestCredit',
  offline: 'byokTestOffline',
  timeout: 'byokTestTimeout',
  error: 'byokTestError',
};

/**
 * The Test verdict, in words plus the provider's own reply.
 * Split out so the failure path can be rendered directly in a test: a red
 * verdict is worthless if it only ever appears in a console.
 */
export function BrainVerdict({ lang, result }: { lang: Lang; result: BrainProbeResult }) {
  return (
    <p
      data-testid="byok-verdict"
      data-verdict={result.verdict}
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3.5 py-2 text-[11px] leading-relaxed ${
        result.ok
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100/90'
          : 'border-amber-300/30 bg-amber-400/10 text-amber-100/90'
      }`}
    >
      {result.ok ? '✓ ' : '✗ '}
      {t(lang, VERDICT_KEY[result.verdict])}
      {!result.ok && result.detail && (
        <span className="mt-1 block break-words text-white/60">
          {t(lang, 'byokTestDetail', { detail: result.detail })}
        </span>
      )}
      {result.model && (
        <span className="mt-1 block text-white/35">
          {result.model}{result.ms ? ` · ${(result.ms / 1000).toFixed(1)}s` : ''}
        </span>
      )}
    </p>
  );
}

const isKeyed = (p: BrainProvider): p is BrainId => p !== 'auto';
const KEYED = BRAIN_SPECS.filter((s) => !s.keyless);

/**
 * Device state as an external store rather than an effect.
 *
 * Reading localStorage during render would desync the server HTML from the
 * first client render, and copying it in on mount via setState is a cascading
 * render (and a lint error). useSyncExternalStore is the API built for this:
 * React renders the server snapshot for the server pass and the hydration
 * pass, then swaps in the real device state — no mismatch, no effect.
 */
const listeners = new Set<() => void>();
function subscribeBrain(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function notifyBrain(): void {
  for (const l of [...listeners]) l();
}
/** "<provider>#<one flag per keyed spec>" — a primitive, so React can compare. */
function readBrainSnapshot(): string {
  return `${brainProvider()}#${KEYED.map((s) => (brainKey(s.id) ? '1' : '0')).join('')}`;
}
function serverBrainSnapshot(): string {
  return `auto#${KEYED.map(() => '0').join('')}`;
}

const FIELD = 'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25';
const SMALL = 'ui-btn rounded-full px-3 py-1.5 text-xs';

export default function BrainByok({ lang, accent }: { lang: Lang; accent: string }) {
  // Provider choice + which slots hold a key, read straight from the device
  // store. Nothing is copied into React state, so a saved key can never be
  // re-rendered out of it.
  const snapshot = useSyncExternalStore(subscribeBrain, readBrainSnapshot, serverBrainSnapshot);
  const [rawProvider, keyFlags] = snapshot.split('#');
  const provider = (rawProvider ?? 'auto') as BrainProvider;
  const hasKey: Record<string, boolean> = {};
  KEYED.forEach((s, i) => { hasKey[s.id] = keyFlags?.[i] === '1'; });

  // Deliberately starts EMPTY and is cleared on save: a saved key must not
  // exist in the DOM. The store's flags carry the only fact the UI needs.
  const [draft, setDraft] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<BrainProbeResult | null>(null);

  const selected = provider;
  // On "Automatic" there is still a concrete target to paste into: the first
  // provider that already has a key, else the first keyed provider. Without
  // this the key field would stay hidden until a provider was picked, which is
  // exactly the discoverability problem this section exists to fix.
  const activeId: BrainId = isKeyed(selected)
    ? selected
    : (KEYED.find((s) => hasKey[s.id]) ?? KEYED[0]!).id;
  const spec = BRAIN_SPECS.find((s) => s.id === activeId)!;

  /** Saving while on "Automatic" stays on Automatic — auto's own top-down order
   *  picks the key up. Only an explicit pick forces one brain. */
  const adopt = (id: BrainId) => {
    if (isKeyed(selected)) setBrainProvider(id);
    // Drop the plaintext from React state: from here on it lives only in
    // localStorage, so it can never be rendered back out.
    setDraft('');
    notifyBrain();
  };

  const save = () => {
    if (!saveBrainKey(activeId, draft)) return; // a blank paste never clears a good key
    adopt(activeId);
    setResult(null);
  };

  const remove = () => {
    setBrainKey(activeId, '');
    if (isKeyed(selected)) setBrainProvider('auto');
    setDraft('');
    setResult(null);
    notifyBrain();
  };

  // Save-then-test, the same contract the TTS proxy / OpenAI fields use above:
  // the probe must exercise the key that is actually in the field.
  const test = () => {
    const typed = draft.trim();
    if (typed) {
      saveBrainKey(activeId, typed);
      adopt(activeId);
    } else if (!brainKey(activeId)) {
      setResult({ verdict: 'nokey', ok: false, detail: '', model: '', ms: 0 });
      return;
    }
    setResult(null);
    setTesting(true);
    void probeBrain(activeId).then((r) => {
      setTesting(false);
      setResult(r);
    }).catch((e: unknown) => {
      // probeBrain funnels every failure into a verdict; this only catches a
      // programming error, and even then the message lands on screen.
      setTesting(false);
      setResult({ verdict: 'error', ok: false, detail: String(e), model: '', ms: 0 });
    });
  };

  const saved = !!hasKey[activeId];
  const tier = t(lang, TIER_KEY[spec.id]);

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] leading-relaxed text-white/50">{t(lang, 'byokHint')}</p>

      <label htmlFor="amoji-settings-byok-provider" className="block text-sm text-white/85">
        {t(lang, 'byokProvider')}
      </label>
      <select
        id="amoji-settings-byok-provider"
        name="brain-provider"
        aria-label={t(lang, 'byokProvider')}
        value={selected}
        onChange={(e) => {
          setBrainProvider(e.target.value as BrainProvider);
          setDraft('');
          setResult(null);
          notifyBrain();
        }}
        className={FIELD}
      >
        <option value="auto">{t(lang, 'byokAuto')}</option>
        {BRAIN_SPECS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}{!s.keyless && hasKey[s.id] ? ' · ✓' : ''}
          </option>
        ))}
      </select>

      <div className="space-y-1.5" data-provider={spec.id}>
        <p className="text-[11px] leading-relaxed text-white/50">{spec.blurb} · {tier}</p>

        {REGION_KEY[spec.id] && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3.5 py-2 text-[11px] leading-relaxed text-amber-100/90">
            📍 {t(lang, REGION_KEY[spec.id]!)}
          </p>
        )}

        {spec.keyless ? (
          <p className="text-[11px] leading-relaxed text-white/40">{t(lang, 'byokNoKeyNeeded')}</p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="amoji-settings-byok-key" className="block text-sm text-white/85">
              {t(lang, 'byokKeyLabel')}
            </label>
            <input
              id="amoji-settings-byok-key"
              name="brain-api-key"
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={t(lang, 'byokKeyLabel')}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setResult(null); }}
              placeholder={t(lang, 'byokKeyPlaceholder')}
              className={FIELD}
            />
            <p className="text-[11px] leading-relaxed text-white/40">{t(lang, 'byokLocalOnly')}</p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={t(lang, 'byokSave')}
                onClick={save}
                disabled={!draft.trim()}
                className={`${SMALL} text-white/90 disabled:opacity-40`}
                style={{ backgroundColor: `${accent}2e` }}
              >
                {t(lang, 'byokSave')}
              </button>
              <button
                type="button"
                aria-label={t(lang, 'byokTest')}
                onClick={test}
                disabled={testing}
                className={`${SMALL} text-white/80 disabled:opacity-50`}
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                {testing ? t(lang, 'byokTesting') : t(lang, 'byokTest')}
              </button>
              {saved && (
                <button
                  type="button"
                  aria-label={t(lang, 'byokRemove')}
                  onClick={remove}
                  className={`${SMALL} text-white/60`}
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  {t(lang, 'byokRemove')}
                </button>
              )}
              <a
                href={spec.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t(lang, 'byokGetKey')} ${spec.label}`}
                className={`${SMALL} text-white/70`}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                {t(lang, 'byokGetKey')}
              </a>
            </div>

            {saved
              ? !result && <p className="text-[11px] text-emerald-200/80">✓ {t(lang, 'byokKeySaved')}</p>
              : !result && <p className="text-[11px] text-white/40">{t(lang, 'byokNoKey')}</p>}
          </div>
        )}

        {result && <BrainVerdict lang={lang} result={result} />}
      </div>

      <p className="text-[10px] leading-relaxed text-white/30">{t(lang, 'byokWorksWithout')}</p>
    </div>
  );
}
