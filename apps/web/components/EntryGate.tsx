'use client';
/**
 * First-run entry gate — 18+ acknowledgement + audio readiness.
 *
 * WHY THIS SCREEN EXISTS
 * ----------------------
 * Two product decisions (Mon):
 *   1. Amoji is a VOICE companion, and the iPhone hardware silent switch mutes
 *      speechSynthesis completely. Nothing in the browser can detect that — so
 *      a user with the switch on sees her face move and hears nothing, and
 *      concludes the app is broken. This screen names the switch before the
 *      user meets the chat screen.
 *   2. Amoji is ADULT ONLY (18+). The age-rating question becomes live the
 *      moment the app is submitted to a store, and a companion product that
 *      quietly lets a child in is the wrong product.
 *
 * WHY THE GATE IS DRIVEN BY THE USER, NOT BY DETECTION
 * ---------------------------------------------------
 * `speechSynthesis` fires `onstart` and `onend` normally even when the output
 * is muted by the hardware switch, by a muted tab, by a Bluetooth route or by
 * zero volume. Every signal available to a page says "audio played" while the
 * user hears silence. So this screen never claims to have verified sound: it
 * plays a real sample through the app's own voice path and then ASKS. The
 * answer is stored as the user's judgement (lib/entry-gate.ts), which is the
 * only honest record that can be made.
 *
 * The gate is mandatory but NOT a trap: after "I heard nothing" the user gets
 * the concrete troubleshooting list plus a "continue anyway" route, so someone
 * with genuinely broken audio is never locked out of the app they installed.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPrefs, t, type Lang } from '../lib/prefs';
import { passEntryGate, type MicOutcome } from '../lib/entry-gate';
import { testVoiceChain } from '../lib/voice';
import { isMasterMuted, setMasterMuted } from '../lib/master-mute';
import { listenSupported } from '../lib/listen';
import { INITIAL_GATE, reduceGate, type GateEvent, type GateState } from '../lib/entry-gate-flow';

const STEP_OF: Record<GateState['phase'], number> = {
  adult: 1,
  audio: 2,
  help: 2,
  mic: 3,
  done: 3,
};
const TOTAL_STEPS = 3;

/** Request the mic for real, then hand the device back. */
async function requestMic(): Promise<MicOutcome> {
  if (!listenSupported()) return 'unsupported';
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return 'unsupported';
  try {
    const stream = await md.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch {
    // NotAllowedError, NotFoundError and the rest all mean "no mic input" to
    // this app; the copy for 'denied' covers both a refusal and a device that
    // cannot record.
    return 'denied';
  }
}

export default function EntryGate({
  lang: langProp,
  onDone,
}: {
  lang?: Lang;
  /** Called once the gate is answered. The route decides where to go next. */
  onDone?: () => void;
}) {
  const [lang, setLang] = useState<Lang>(langProp ?? 'en');
  const [state, setState] = useState<GateState>(INITIAL_GATE);
  const [playing, setPlaying] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    // localStorage cannot be read during render (the server has none, and
    // reading it during hydration would produce a mismatch), so the language
    // is adopted one paint after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (langProp) { setLang(langProp); return; }
    try { setLang(loadPrefs().lang); } catch { /* keep English */ }
  }, [langProp]);

  const send = useCallback((event: GateEvent) => setState((s) => reduceGate(s, event)), []);

  // Move focus to the new step's heading so a keyboard / screen-reader user is
  // told the screen changed, and cannot tab "through" a step they never read.
  useEffect(() => {
    titleRef.current?.focus();
  }, [state.phase]);

  const playSample = useCallback(async () => {
    setPlaying(true);
    // Mute All would swallow the sample, which would make this screen absurd:
    // the user is being asked to judge whether they can hear her. Asking for
    // sound explicitly unmutes — that IS the action this gate exists for.
    try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
    let characterId = 'a01-shino';
    try { characterId = loadPrefs().character; } catch { /* keep default */ }
    try {
      // The app's real voice chain — the same tiers the chat screen will use.
      // The returned per-tier ✓/✗ are IGNORED on purpose: a tier reporting
      // success proves only that the engine accepted the line, not that the
      // speaker emitted it. Only the user's answer below is trustworthy.
      await testVoiceChain(characterId, lang);
    } catch {
      /* a dead chain is exactly the case the question and help list cover */
    } finally {
      setPlaying(false);
      // Unlocks the question. This records "a sample was played", never "sound
      // was verified" — those are different facts and only the first is ours.
      send({ type: 'testPlayed' });
    }
  }, [lang, send]);

  const allowMic = useCallback(async () => {
    setMicBusy(true);
    const outcome = await requestMic();
    setMicBusy(false);
    // Shows the outcome and keeps the user on this step so they can read it.
    send({ type: 'micDone', outcome });
  }, [send]);

  const enterApp = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    passEntryGate({
      adultAcknowledgedAt: new Date().toISOString(),
      audioHeard: state.heard === 'no' ? 'no' : 'yes',
      mic: state.mic,
    });
    send({ type: 'enterApp' });
    onDone?.();
  }, [onDone, send, state.heard, state.mic]);

  const skipMic = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    passEntryGate({
      adultAcknowledgedAt: new Date().toISOString(),
      audioHeard: state.heard === 'no' ? 'no' : 'yes',
      mic: 'skipped',
    });
    send({ type: 'skipMic' });
    onDone?.();
  }, [onDone, send, state.heard]);

  const stepLabel = t(lang, 'gateStep', { n: String(STEP_OF[state.phase]), total: String(TOTAL_STEPS) });

  return (
    <main
      data-testid="entry-gate"
      aria-labelledby="amoji-gate-title"
      className="fx-page relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-950 px-5 py-8 text-white"
    >
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />

      <div className="relative flex w-full max-w-lg flex-col gap-4">
        <div role="group" aria-label={stepLabel} className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              aria-current={i + 1 === STEP_OF[state.phase] ? 'step' : undefined}
              className={`h-1.5 rounded-full transition-all ${i + 1 === STEP_OF[state.phase] ? 'w-8 bg-white' : 'w-1.5 bg-white/25'}`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-md">
          {state.phase === 'adult' && (
            <section aria-labelledby="amoji-gate-title" className="space-y-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Amoji</p>
              <h1
                ref={titleRef}
                id="amoji-gate-title"
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none"
              >
                {t(lang, 'gate18Title')}
              </h1>
              <p className="text-sm leading-relaxed text-white/70">{t(lang, 'gate18Body')}</p>

              <label
                htmlFor="amoji-gate-adult"
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/12 bg-white/5 p-3.5 text-sm"
              >
                <input
                  id="amoji-gate-adult"
                  name="adult"
                  type="checkbox"
                  checked={state.adult}
                  onChange={() => send({ type: 'toggleAdult' })}
                  data-testid="entry-gate-18"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-pink-400"
                />
                <span className="text-white/85">{t(lang, 'gate18Ack')}</span>
              </label>

              <button
                type="button"
                onClick={() => send({ type: 'confirmAdult' })}
                disabled={!state.adult}
                data-testid="entry-gate-18-continue"
                aria-label={t(lang, 'gate18Cta')}
                className="ui-btn ui-btn-primary h-12 w-full rounded-full bg-white text-base font-semibold text-black disabled:pointer-events-none disabled:opacity-40"
              >
                {t(lang, 'gate18Cta')}
              </button>
            </section>
          )}

          {state.phase === 'audio' && (
            <section aria-labelledby="amoji-gate-title" className="space-y-4">
              <h1
                ref={titleRef}
                id="amoji-gate-title"
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none"
              >
                {t(lang, 'gateAudioTitle')}
              </h1>
              <p className="text-sm leading-relaxed text-white/70">{t(lang, 'gateAudioBody')}</p>

              {/* The single most important paragraph on this screen. */}
              <p
                data-testid="entry-gate-silent-switch"
                className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3.5 text-sm leading-relaxed text-amber-100"
              >
                {t(lang, 'gateAudioIosHint')}
              </p>

              <button
                type="button"
                onClick={() => void playSample()}
                disabled={playing}
                data-testid="entry-gate-test-sound"
                aria-label={t(lang, 'gateAudioTest')}
                className="ui-btn ui-btn-primary h-12 w-full rounded-full bg-white text-base font-semibold text-black disabled:opacity-60"
              >
                {playing ? t(lang, 'gateAudioPlaying') : t(lang, 'gateAudioTest')}
              </button>

              {/* The question only appears once the sample has actually been
                  played. Before that there is nothing to have heard, and an
                  answer would be a guess rather than a confirmation. */}
              {state.tested && (
                <div className="space-y-2">
                  <p role="status" className="text-sm font-medium text-white/80">{t(lang, 'gateAudioQuestion')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => send({ type: 'heardYes' })}
                      data-testid="entry-gate-heard-yes"
                      aria-label={t(lang, 'gateAudioYes')}
                      className="ui-btn h-11 flex-1 rounded-full bg-emerald-400/90 text-sm font-semibold text-neutral-950"
                    >
                      {t(lang, 'gateAudioYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => send({ type: 'heardNo' })}
                      data-testid="entry-gate-heard-no"
                      aria-label={t(lang, 'gateAudioNo')}
                      className="ui-btn h-11 flex-1 rounded-full border border-white/20 bg-white/5 text-sm font-medium text-white/85"
                    >
                      {t(lang, 'gateAudioNo')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {state.phase === 'help' && (
            <section aria-labelledby="amoji-gate-title" className="space-y-4">
              <h1
                ref={titleRef}
                id="amoji-gate-title"
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none"
              >
                {t(lang, 'gateHelpTitle')}
              </h1>
              <ul data-testid="entry-gate-help" className="space-y-2.5 text-sm leading-relaxed text-white/75">
                <li className="rounded-xl border border-white/10 bg-white/5 p-3">🔇 {t(lang, 'gateHelpSwitch')}</li>
                <li className="rounded-xl border border-white/10 bg-white/5 p-3">🔊 {t(lang, 'gateHelpVolume')}</li>
                <li className="rounded-xl border border-white/10 bg-white/5 p-3">🎧 {t(lang, 'gateHelpBluetooth')}</li>
                <li className="rounded-xl border border-white/10 bg-white/5 p-3">🚫 {t(lang, 'gateHelpTabMuted')}</li>
              </ul>
              <p className="text-xs leading-relaxed text-white/45">{t(lang, 'gateHelpNote')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => send({ type: 'testAgain' })}
                  data-testid="entry-gate-retry"
                  aria-label={t(lang, 'gateHelpRetry')}
                  className="ui-btn h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black"
                >
                  {t(lang, 'gateHelpRetry')}
                </button>
                <button
                  type="button"
                  onClick={() => send({ type: 'continueAnyway' })}
                  data-testid="entry-gate-continue-anyway"
                  aria-label={t(lang, 'gateHelpContinue')}
                  className="ui-btn h-11 flex-1 rounded-full border border-white/20 bg-white/5 text-sm font-medium text-white/85"
                >
                  {t(lang, 'gateHelpContinue')}
                </button>
              </div>
            </section>
          )}

          {state.phase === 'mic' && (
            <section aria-labelledby="amoji-gate-title" className="space-y-4">
              <h1
                ref={titleRef}
                id="amoji-gate-title"
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none"
              >
                {t(lang, 'gateMicTitle')}
              </h1>
              <p className="text-sm leading-relaxed text-white/70">{t(lang, 'gateMicBody')}</p>

              {/* The outcome is shown, never assumed. A blocked mic reads as
                  blocked and the way in stays available. */}
              {state.mic !== 'skipped' && (
                <p
                  role="status"
                  data-testid="entry-gate-mic-result"
                  data-outcome={state.mic}
                  className={`rounded-2xl border p-3 text-sm leading-relaxed ${
                    state.mic === 'granted'
                      ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                      : 'border-white/15 bg-white/5 text-white/70'
                  }`}
                >
                  {state.mic === 'granted' && t(lang, 'gateMicGranted')}
                  {state.mic === 'denied' && t(lang, 'gateMicDenied')}
                  {state.mic === 'unsupported' && t(lang, 'gateMicUnsupported')}
                </p>
              )}

              <div className="flex gap-2">
                {state.mic !== 'skipped' ? (
                  <button
                    type="button"
                    onClick={enterApp}
                    data-testid="entry-gate-enter"
                    aria-label={t(lang, 'gateEnter')}
                    className="ui-btn ui-btn-primary h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black"
                  >
                    {t(lang, 'gateEnter')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void allowMic()}
                      disabled={micBusy}
                      data-testid="entry-gate-mic-allow"
                      aria-label={t(lang, 'gateMicAllow')}
                      className="ui-btn h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {t(lang, 'gateMicAllow')}
                    </button>
                    <button
                      type="button"
                      onClick={skipMic}
                      data-testid="entry-gate-mic-skip"
                      aria-label={t(lang, 'gateMicSkip')}
                      className="ui-btn h-11 flex-1 rounded-full border border-white/20 bg-white/5 text-sm font-medium text-white/85"
                    >
                      {t(lang, 'gateMicSkip')}
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <p className="text-center text-[11px] text-white/30">{stepLabel}</p>
      </div>
    </main>
  );
}
