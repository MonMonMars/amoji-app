'use client';
// OPTIONAL sharper brain — BYOK (bring your own key), r2026-11-08.
//
// Design constraints, all from measured behaviour:
//  · Drop-off at the key step in comparable products was ~40%, ~80% (185
//    downloads → 36 keys) and 92%. A tutorial did nothing. So this is NOT a
//    setup wizard: it is one collapsed "Advanced" row inside Settings, closed
//    by default, and the sheet already says the app works without it. A
//    non-technical user never meets a key field unless they go looking.
//  · Only providers reachable from Hong Kong are listed (see lib/brain.ts for
//    the measured status codes), Z.ai GLM first because its free tier is free
//    forever with no card and no +86 number.
//  · The Test button is the highest-value affordance: one tap says "works" or
//    names the exact failure, rather than leaving the user to discover it
//    mid-conversation when her reply quietly degrades.
//  · The key is saved only when Test passes (save-on-success), so a typo can
//    never replace a key that used to work.
import { useState } from 'react';
import {
  OFFERED_BRAINS, brainKey, brainProvider, pickBrain, probeBrain, setBrainKey, setBrainProvider,
  type BrainProbe, type BrainProvider,
} from '../lib/brain';
import { t, type Lang } from '../lib/prefs';

const PROBE_KEY: Record<BrainProbe, 'brainTestOk' | 'brainTestNokey' | 'brainTestAuth' | 'brainTestBlocked' | 'brainTestModel' | 'brainTestCredit' | 'brainTestOffline' | 'brainTestTimeout'> = {
  ok: 'brainTestOk',
  nokey: 'brainTestNokey',
  auth: 'brainTestAuth',
  blocked: 'brainTestBlocked',
  model: 'brainTestModel',
  credit: 'brainTestCredit',
  offline: 'brainTestOffline',
  timeout: 'brainTestTimeout',
};

export default function BrainAdvanced({ lang, accent }: { lang: Lang; accent: string }) {
  // Closed by default is the whole point: this section is an upgrade, not a
  // step. It re-opens by itself only if a key already exists on this device
  // (that user has clearly opted in before and may want to change it).
  // State is read once through lazy initializers rather than an effect: this
  // component only mounts after the user opens Settings, so there is no
  // server-rendered markup to hydrate against, and an effect would just add a
  // second render pass on every open.
  const [open, setOpen] = useState(() => {
    const current = brainProvider();
    return current !== 'auto' && Boolean(brainKey(current));
  });
  const [provider, setProvider] = useState<BrainProvider>(() => brainProvider());
  const [draft, setDraft] = useState(() => {
    const current = brainProvider();
    const picked = pickBrain();
    const target = current === 'auto'
      ? (!picked.spec.keyless && brainKey(picked.spec.id) ? picked.spec.id : 'zai')
      : current;
    return brainKey(target);
  });
  const [stored, setStored] = useState(() => Boolean(draft));
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<BrainProbe | null>(null);

  if (!open) {
    return (
      <section id="amoji-settings-brain" className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="amoji-settings-brain"
          className="ui-btn flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
        >
          <span className="text-sm text-white/85">
            🧠 {t(lang, 'brainAdvanced')}
            <span className="block text-[11px] text-white/40">{t(lang, 'brainAdvancedHint')}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/45">
            {t(lang, 'brainOptional')}
          </span>
        </button>
      </section>
    );
  }

  /** the provider whose key the field edits. With `auto` selected, prefer the
   *  provider that already holds a key; with no key at all, fall back to the
   *  first offered keyed provider (Z.ai GLM) so the field is always actionable
   *  instead of resolving to the keyless lane and showing nothing to paste. */
  const autoTarget = (): string => {
    const picked = pickBrain();
    if (!picked.spec.keyless && brainKey(picked.spec.id)) return picked.spec.id;
    return OFFERED_BRAINS.find((s) => !s.keyless)?.id ?? picked.spec.id;
  };
  const activeId = provider === 'auto' ? autoTarget() : provider;
  const spec = OFFERED_BRAINS.find((s) => s.id === activeId) ?? OFFERED_BRAINS[0]!;

  const pickProvider = (next: BrainProvider) => {
    setProvider(next);
    setProbe(null);
    const target = next === 'auto' ? autoTarget() : next;
    setDraft(brainKey(target));
    setStored(Boolean(brainKey(target)));
    setBrainProvider(next);
  };

  // Save-on-success: the key is committed only after it proves itself, so a
  // typo cannot silently replace a working key. Test still runs on a blank
  // provider (there is nothing to save) and says so.
  const runTest = () => {
    setProbing(true);
    setProbe(null);
    void probeBrain(spec.id, draft).then((verdict) => {
      setProbing(false);
      setProbe(verdict);
      if (verdict === 'ok') {
        setBrainKey(spec.id, draft);
        setStored(Boolean(draft.trim()));
        setBrainProvider(spec.id);
        setProvider(spec.id);
      }
    });
  };

  const clearKey = () => {
    setBrainKey(spec.id, '');
    setDraft('');
    setStored(false);
    setProbe(null);
    if (provider === spec.id) { setProvider('auto'); setBrainProvider('auto'); }
  };

  return (
    <section id="amoji-settings-brain" className="space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-expanded
        aria-controls="amoji-settings-brain"
        className="ui-btn flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">🧠 {t(lang, 'brainAdvanced')}</span>
        <span className="text-[11px] text-white/40">{t(lang, 'brainHide')} ▾</span>
      </button>

      {/* The first thing on screen says the app is already complete. */}
      <p className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3.5 py-2 text-[11px] leading-relaxed text-emerald-100/90">
        ✓ {t(lang, 'brainWorksWithout')}
      </p>

      <label htmlFor="amoji-settings-brain-provider" className="block text-[11px] text-white/45">
        {t(lang, 'brainProvider')}
      </label>
      <select
        id="amoji-settings-brain-provider"
        value={provider}
        onChange={(e) => pickProvider(e.target.value as BrainProvider)}
        className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white/85 outline-none focus:border-white/40"
      >
        <option value="auto">{t(lang, 'brainAuto')}</option>
        {OFFERED_BRAINS.filter((s) => !s.keyless).map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      {spec.keyless ? (
        <p className="text-[11px] leading-relaxed text-white/45">{spec.blurb}</p>
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-white/45">
            {spec.blurb}
            {spec.keyFrom && (
              <>
                {' '}
                <a
                  href={`https://${spec.keyFrom}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sky-300/85 underline decoration-dotted underline-offset-2"
                >
                  {t(lang, 'brainGetKey')} ↗
                </a>
              </>
            )}
          </p>
          <label htmlFor="amoji-settings-brain-key" className="block text-[11px] text-white/45">
            {t(lang, 'brainKeyLabel')}
          </label>
          <input
            id="amoji-settings-brain-key"
            name="brain-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setProbe(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') runTest(); }}
            placeholder={t(lang, 'brainKeyPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={probing}
              className="ui-btn rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {probing ? t(lang, 'brainTesting') : t(lang, 'brainTest')}
            </button>
            {stored && (
              <button
                type="button"
                onClick={clearKey}
                className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/20"
              >
                {t(lang, 'brainClearKey')}
              </button>
            )}
            {stored && !probe && (
              <span className="text-[10px] text-white/40">✓ {t(lang, 'brainKeyStored')}</span>
            )}
          </div>
          {probe && (
            <p
              aria-live="polite"
              className={`rounded-xl border px-3.5 py-2 text-[11px] leading-relaxed ${
                probe === 'ok'
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100/90'
                  : 'border-amber-300/30 bg-amber-400/10 text-amber-100/90'
              }`}
            >
              {probe === 'ok' ? '✓ ' : '! '}
              {t(lang, PROBE_KEY[probe], { provider: spec.label })}            </p>
          )}
          <p className="text-[10px] leading-relaxed text-white/35">{t(lang, 'brainPrivacy')}</p>
        </>
      )}
    </section>
  );
}
