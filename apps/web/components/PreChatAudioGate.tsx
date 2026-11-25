'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPrefs, savePrefs, t, type Lang } from '../lib/prefs';
import {
  testVoiceChain,
  setVoiceEnabled,
  voiceEnabled,
  GATE_TEST_LINES,
  primeAudioForChatEnter,
  stopSpeaking,
} from '../lib/voice';
import { isMasterMuted, setMasterMuted } from '../lib/master-mute';
import { listenSupported } from '../lib/listen';
import { requestMic } from '../lib/mic-preflight';
import { passEntryGate, setMicPreflightSession, type MicOutcome } from '../lib/entry-gate';
import { markChatAudioReady, stashPriorMasterMuteForChat } from '../lib/pre-chat-audio';
import { primeChatStartGesture } from '../lib/chat-start-gesture';
import { companionPlaybackSession } from '../lib/voice-chat-focus';
import { primeLocationForChatEnter } from '../lib/live-tools';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import { LangChips } from './selectors';

export type LocationGateUi = 'idle' | 'asked' | 'ready' | 'denied' | 'unsupported';

/** Soft sound-check step after the sample finishes (or is replayed). */
export type SoundCheckUi = 'idle' | 'asked' | 'ok' | 'help';

export type GateSoundButtonProps = {
  'data-testid': string;
  /** True while the sound-check line is actually in flight. */
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  testLabel: string;
  stopLabel: string;
  /** Height / margin only — width, colours and the dot live here. */
  className?: string;
};

/**
 * Test / Stop control for the sound check (owner 2026-11-26: "it keep on
 * talking, please add a stop button to stop the test"). While the sample is
 * playing the SAME full-width button becomes Stop — never `disabled`, so a
 * long gate line can always be cut by touch or keyboard. The pulsing dot only
 * exists while sound is actually in flight. The full-width base means the
 * label swap cannot shift the card, and the label itself is the accessible
 * name (mirrored in aria-label so it is stable for assistive tech).
 */
export function GateSoundButton({
  'data-testid': testId,
  playing,
  onPlay,
  onStop,
  testLabel,
  stopLabel,
  className = '',
}: GateSoundButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-playing={playing ? '1' : '0'}
      data-action={playing ? 'stop' : 'play'}
      aria-label={playing ? stopLabel : testLabel}
      onClick={playing ? onStop : onPlay}
      className={`ui-btn flex w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black ${className}`}
    >
      <span>{playing ? stopLabel : testLabel}</span>
      <span
        aria-hidden
        className={`inline-block h-2 w-2 shrink-0 rounded-full bg-black/45 transition-opacity ${playing ? 'animate-pulse opacity-100' : 'opacity-0'}`}
      />
    </button>
  );
}

export default function PreChatAudioGate({
  onDone,
  showBack = true,
  nextHref = '/',
}: {
  onDone?: () => void;
  showBack?: boolean;
  nextHref?: string;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return loadPrefs().lang;
    } catch {
      return 'en';
    }
  });
  const pickLang = useCallback((l: Lang) => {
    setLang(l);
    try {
      savePrefs({ ...loadPrefs(), lang: l });
    } catch {
      /* keep UI lang even if storage fails */
    }
  }, []);
  const [soundTested, setSoundTested] = useState(false);
  const [soundUi, setSoundUi] = useState<SoundCheckUi>('idle');
  const [heard, setHeard] = useState<'yes' | 'no' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mic, setMic] = useState<MicOutcome | 'pending'>(() =>
    listenSupported() ? 'pending' : 'unsupported',
  );
  const [micBusy, setMicBusy] = useState(false);
  const [locationUi, setLocationUi] = useState<LocationGateUi>('idle');
  const [locationBusy, setLocationBusy] = useState(false);
  const primedExtras = useRef(false);
  /** Mirror of `playing` for interval callbacks (state is stale inside timers). */
  const playingRef = useRef(false);
  /** Monotonic attempt id — a stop retires the running attempt. */
  const attemptSeq = useRef(0);
  /** Stopped attempts whose testVoiceChain is still unwinding. */
  const retiredAttempts = useRef(0);
  const stopMopTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const markPlaying = useCallback((v: boolean) => {
    playingRef.current = v;
    setPlaying(v);
  }, []);

  const stopMop = useCallback(() => {
    if (stopMopTimer.current !== null) {
      clearInterval(stopMopTimer.current);
      stopMopTimer.current = null;
    }
  }, []);

  /**
   * `testVoiceChain()` treats Error('canceled') as "this tier did not speak"
   * and falls through to the NEXT hop (voice.ts, every hop's catch). One
   * stopSpeaking() therefore silences only the tier that was audible and the
   * browser-synth hop can start the same line again ~immediately — the owner's
   * "it keep on talking". Keep cutting until the retired chain settles, but
   * never while a live attempt owns the speaker.
   */
  const armStopMop = useCallback(() => {
    if (stopMopTimer.current !== null) return;
    const until = Date.now() + 90_000;
    stopMopTimer.current = setInterval(() => {
      if (retiredAttempts.current <= 0 || Date.now() > until) { stopMop(); return; }
      if (playingRef.current) return;
      try { stopSpeaking(); } catch { /* ignore */ }
    }, 80);
  }, [stopMop]);

  useEffect(() => () => stopMop(), [stopMop]);

  useEffect(() => {
    stashPriorMasterMuteForChat();
  }, []);

  const allowMic = useCallback(async () => {
    // Re-click re-triggers the browser/iOS permission prompt.
    setMicBusy(true);
    try {
      const outcome = await requestMic();
      setMic(outcome);
      if (outcome === 'granted') setMicPreflightSession(true);
      else setMicPreflightSession(false);
      return outcome;
    } finally {
      setMicBusy(false);
    }
  }, []);

  const allowLocation = useCallback(() => {
    // Same-gesture prime as mic — browser may show the geo popup once.
    setLocationBusy(true);
    setLocationUi('asked');
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setLocationUi('unsupported');
        return;
      }
      primeLocationForChatEnter();
      setLocationUi('ready');
    } catch {
      setLocationUi('denied');
    } finally {
      setLocationBusy(false);
    }
  }, []);

  /**
   * Sync unlock + kick mic/location from the same tap as the sample.
   * Do not await getUserMedia before TTS — the permission sheet would drop
   * the user-gesture audio unlock and the sample stays silent.
   */
  const preOpenExtras = useCallback(() => {
    try { primeChatStartGesture(); } catch { /* ignore */ }
    try { primeAudioForChatEnter(); } catch { /* ignore */ }
    try { companionPlaybackSession(); } catch { /* ignore */ }
    try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
    try { if (!voiceEnabled()) setVoiceEnabled(true); } catch { /* ignore */ }
    if (!primedExtras.current) {
      primedExtras.current = true;
      if (listenSupported()) {
        void allowMic().catch(() => { /* Allow button remains */ });
      }
      try { allowLocation(); } catch { /* Allow button remains */ }
    }
  }, [allowLocation, allowMic]);

  const playSample = useCallback(async () => {
    // Keep button / section labels fixed while playing — no layout flip.
    // Re-click restarts the sample and clears the prior hear answer in place.
    const attempt = ++attemptSeq.current;
    setHeard(null);
    setSoundUi('asked');
    markPlaying(true);
    try {
      preOpenExtras();
      try { stopSpeaking(); } catch { /* ignore */ }
      let characterId = 'a01-shino';
      try { characterId = loadPrefs().character; } catch { /* default */ }
      // Long GATE_TEST_LINES + forcePlaybackVolume(1) inside testVoiceChain.
      await testVoiceChain(characterId, lang, GATE_TEST_LINES[lang] ?? GATE_TEST_LINES.en);
    } catch {
      /* retryable — never blocks Continue */
    } finally {
      if (attempt !== attemptSeq.current) {
        // Retired by the owner's Stop: the line was cut, so this attempt is
        // NOT evidence that they heard her — never set soundTested here.
        retiredAttempts.current = Math.max(0, retiredAttempts.current - 1);
        if (retiredAttempts.current === 0) stopMop();
        return;
      }
      markPlaying(false);
      setSoundTested(true);
      setSoundUi('asked');
    }
  }, [lang, markPlaying, preOpenExtras, stopMop]);

  /**
   * Stop the gate sample now. Cuts every engine stopSpeaking() owns (gtts mp3,
   * edge, openai, browser synth, clips, thinking bed), then keeps the cut alive
   * until testVoiceChain stops falling through to the next tier. The attempt is
   * retired first, so its finally cannot claim the speaker was heard.
   */
  const stopSample = useCallback(() => {
    if (!playingRef.current) return;
    attemptSeq.current += 1;
    retiredAttempts.current += 1;
    markPlaying(false);
    try { stopSpeaking(); } catch { /* ignore */ }
    armStopMop();
  }, [armStopMop, markPlaying]);

  const speakerOk = soundTested && !isMasterMuted() && voiceEnabled();
  const micOk = mic === 'granted' || mic === 'unsupported';

  const enter = useCallback(() => {
    // Enter is a real user gesture — re-probe mic + prime location so Start
    // does not surprise-ask geo later (standing rule: all-in-one gate page).
    void (async () => {
      primeChatStartGesture();
      try { primeAudioForChatEnter(); } catch { /* ignore */ }
      try { companionPlaybackSession(); } catch { /* ignore */ }
      let micOutcome: MicOutcome = mic === 'pending' ? 'skipped' : mic;
      if (listenSupported() && micOutcome !== 'unsupported') {
        try {
          const outcome = await requestMic();
          micOutcome = outcome;
          setMic(outcome);
          if (outcome === 'granted') setMicPreflightSession(true);
        } catch {
          /* keep prior outcome */
        }
      }
      if (micOutcome === 'granted') setMicPreflightSession(true);
      try {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          primeLocationForChatEnter();
          setLocationUi((prev) => (prev === 'idle' ? 'asked' : prev));
        } else {
          setLocationUi('unsupported');
        }
      } catch { /* chat enter must not block on geo */ }
      const audioHeard =
        heard === 'yes' || heard === 'no'
          ? heard
          : speakerOk
            ? 'yes'
            : 'no';
      passEntryGate({
        audioHeard,
        mic: micOutcome,
      });
      markChatAudioReady();
      if (onDone) onDone();
      else router.replace(nextHref);
    })();
  }, [heard, mic, nextHref, onDone, router, speakerOk]);

  const continueLabel =
    nextHref === '/chat' || nextHref.startsWith('/chat?')
      ? t(lang, 'preChatEnterChat')
      : t(lang, 'next');

  const hearReady = soundTested && !playing;
  const micStatus =
    mic === 'pending'
      ? '\u00a0'
      : mic === 'granted'
        ? t(lang, 'gateMicGranted')
        : mic === 'unsupported'
          ? t(lang, 'gateMicUnsupported')
          : t(lang, 'gateMicDenied');
  const locationStatus =
    locationUi === 'idle'
      ? '\u00a0'
      : locationUi === 'ready' || locationUi === 'asked'
        ? t(lang, 'gateLocationReady')
        : locationUi === 'unsupported'
          ? t(lang, 'gateLocationUnsupported')
          : t(lang, 'gateLocationDenied');

  return (
    <main data-testid="pre-chat-audio-gate" className="fx-page flex min-h-dvh items-center justify-center bg-neutral-950 px-5 py-8 text-white">
      <EarlyAudioUnlock />
      {showBack && (
        <button type="button" data-testid="pre-chat-audio-back" onClick={() => router.push('/setup')} className="ui-btn absolute left-4 top-4">
          ← {t(lang, 'back')}
        </button>
      )}
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-white/[0.04] p-5">
        <h1 className="text-2xl font-bold">{t(lang, 'preChatGateTitle')}</h1>
        <p className="mt-2 text-sm text-white/70">{t(lang, 'preChatGateLead')}</p>
        <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{t(lang, 'gateAudioIosHint')}</p>

        <section data-testid="pre-chat-lang-chips" aria-labelledby="pre-chat-lang-heading" className="mt-4 space-y-2">
          <h2 id="pre-chat-lang-heading" className="text-sm font-semibold text-white/90">
            {t(lang, 'chooseLanguage')}
          </h2>
          <LangChips value={lang} onChange={pickLang} />
        </section>

        {/* Fixed width: label swaps to Stop while the line is in flight so the
            owner is never locked out of cutting it (data-action=stop). */}
        <GateSoundButton
          data-testid="pre-chat-test-sound"
          playing={playing}
          onPlay={() => void playSample()}
          onStop={stopSample}
          testLabel={t(lang, 'gateAudioTest')}
          stopLabel={t(lang, 'gateAudioStop')}
          className="mt-3 h-12"
        />

        <p className="mt-2 min-h-4 text-xs text-amber-100/90">
          {isMasterMuted() && soundTested ? t(lang, 'preChatUnmuteHint') : '\u00a0'}
        </p>

        {/* Hear ask always mounted so yes/no does not shove the page on first play. */}
        <div data-testid="pre-chat-hear-ask" className="mt-2 space-y-3">
          <p className={`text-sm ${hearReady ? 'text-white/80' : 'text-white/35'}`}>
            {t(lang, 'gateAudioQuestion')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              data-testid="pre-chat-hear-yes"
              disabled={!hearReady}
              onClick={() => {
                setHeard('yes');
                setSoundUi('ok');
              }}
              className="ui-btn h-11 flex-1 rounded-full bg-emerald-400/90 font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t(lang, 'gateAudioYes')}
            </button>
            <button
              type="button"
              data-testid="pre-chat-hear-no"
              disabled={!hearReady}
              onClick={() => {
                setHeard('no');
                setSoundUi('help');
              }}
              className="ui-btn h-11 flex-1 rounded-full border border-white/25 bg-white/10 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t(lang, 'gateAudioNo')}
            </button>
          </div>
        </div>

        {/* Reserved feedback slot — ok / help swap inside fixed min-height. */}
        <div className="mt-4 min-h-[9.5rem]">
          {soundUi === 'ok' && (
            <p
              data-testid="pre-chat-hear-ok"
              className="rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-3 text-sm text-emerald-50"
            >
              {t(lang, 'preChatHeardOk')}
            </p>
          )}
          {soundUi === 'help' && (
            <div
              data-testid="pre-chat-hear-help"
              className="space-y-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-50"
            >
              <p className="font-semibold">{t(lang, 'gateHelpTitle')}</p>
              <ul className="list-disc space-y-2 pl-5 text-amber-50/90">
                <li>{t(lang, 'gateHelpSwitch')}</li>
                <li>{t(lang, 'gateHelpVolume')}</li>
                <li>{t(lang, 'gateHelpBluetooth')}</li>
                <li>{t(lang, 'gateHelpTabMuted')}</li>
              </ul>
              <p className="text-xs text-amber-100/80">{t(lang, 'gateHelpNote')}</p>
              <GateSoundButton
                data-testid="pre-chat-hear-retry"
                playing={playing}
                onPlay={() => void playSample()}
                onStop={stopSample}
                testLabel={t(lang, 'gateHelpRetry')}
                stopLabel={t(lang, 'gateAudioStop')}
                className="h-10"
              />
            </div>
          )}
        </div>

        {/* Mic optional: permission button only — no composer / typing field. */}
        <section data-testid="pre-chat-mic-section" aria-labelledby="pre-chat-mic-heading" className="mt-5 space-y-3">
          <div className="space-y-2">
            <h2 id="pre-chat-mic-heading" className="text-sm font-semibold text-white/90">
              {t(lang, 'gateMicTitle')}
            </h2>
            <p className="text-xs text-white/55">{t(lang, 'gateMicBody')}</p>
          </div>

          <p
            role="status"
            data-testid="pre-chat-mic-result"
            data-outcome={mic}
            className="min-h-5 text-sm text-white/75"
          >
            {micStatus}
          </p>

          {/* Allow stays clickable so re-click re-triggers the iPhone/browser popup. */}
          {listenSupported() && mic !== 'unsupported' && (
            <button
              type="button"
              data-testid="pre-chat-mic-allow"
              disabled={micBusy}
              onClick={() => void allowMic()}
              className="ui-btn h-11 w-full rounded-full bg-white font-semibold text-black"
            >
              {t(lang, 'gateMicAllow')}
            </button>
          )}
        </section>

        {/* Location on the same confirm page — Start must not surprise-ask later. */}
        <section data-testid="pre-chat-location-section" aria-labelledby="pre-chat-location-heading" className="mt-5 space-y-3">
          <div className="space-y-2">
            <h2 id="pre-chat-location-heading" className="text-sm font-semibold text-white/90">
              {t(lang, 'gateLocationTitle')}
            </h2>
            <p className="text-xs text-white/55">{t(lang, 'gateLocationBody')}</p>
          </div>

          <p
            role="status"
            data-testid="pre-chat-location-result"
            data-outcome={locationUi}
            className="min-h-5 text-sm text-white/75"
          >
            {locationStatus}
          </p>

          <button
            type="button"
            data-testid="pre-chat-location-allow"
            disabled={locationBusy}
            onClick={allowLocation}
            className="ui-btn h-11 w-full rounded-full bg-white font-semibold text-black"
          >
            {t(lang, 'gateLocationAllow')}
          </button>
        </section>

        <p className="mt-4 min-h-4 text-xs text-white/45">
          {!speakerOk || !micOk ? t(lang, 'setupSoundFailLead') : '\u00a0'}
        </p>

        {/* Next always stays enabled — soft gate never traps the user. */}
        <button
          type="button"
          data-testid="pre-chat-enter-chat"
          onClick={enter}
          className="ui-btn mt-6 h-12 w-full rounded-full bg-emerald-400/90 font-semibold text-neutral-950"
        >
          {continueLabel}
        </button>
      </div>
    </main>
  );
}
