'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPrefs, t, type Lang } from '../lib/prefs';
import { testVoiceChain, setVoiceEnabled, voiceEnabled } from '../lib/voice';
import { isMasterMuted, setMasterMuted } from '../lib/master-mute';
import { listenSupported } from '../lib/listen';
import { requestMic } from '../lib/mic-preflight';
import { passEntryGate, setMicPreflightSession, type MicOutcome } from '../lib/entry-gate';
import { markChatAudioReady, stashPriorMasterMuteForChat } from '../lib/pre-chat-audio';
import { primeChatStartGesture } from '../lib/chat-start-gesture';
import EarlyAudioUnlock from './EarlyAudioUnlock';

/** Soft sound-check step after the sample finishes (or is replayed). */
export type SoundCheckUi = 'idle' | 'asked' | 'ok' | 'help';

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
  const [lang, setLang] = useState<Lang>('en');
  const [soundTested, setSoundTested] = useState(false);
  const [soundUi, setSoundUi] = useState<SoundCheckUi>('idle');
  const [heard, setHeard] = useState<'yes' | 'no' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mic, setMic] = useState<MicOutcome | 'pending'>('pending');
  const [micBusy, setMicBusy] = useState(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setLang(loadPrefs().lang); } catch { /* en */ }
    stashPriorMasterMuteForChat();
    if (!listenSupported()) setMic('unsupported');
  }, []);

  const playSample = useCallback(async () => {
    // Re-click always restarts the hear/not-hear choice after playback.
    setHeard(null);
    setSoundUi('idle');
    setPlaying(true);
    try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
    try { if (!voiceEnabled()) setVoiceEnabled(true); } catch { /* ignore */ }
    try { primeChatStartGesture(); } catch { /* ignore */ }
    let characterId = 'a01-shino';
    try { characterId = loadPrefs().character; } catch { /* default */ }
    try {
      await testVoiceChain(characterId, lang);
    } catch {
      /* retryable — never blocks Continue */
    } finally {
      setPlaying(false);
      setSoundTested(true);
      setSoundUi('asked');
    }
  }, [lang]);

  const allowMic = useCallback(async () => {
    // Re-click re-triggers the browser/iOS permission prompt.
    setMicBusy(true);
    try {
      const outcome = await requestMic();
      setMic(outcome);
      if (outcome === 'granted') setMicPreflightSession(true);
    } finally {
      setMicBusy(false);
    }
  }, []);

  // Best-effort auto prompt on mount: unmute + warm AudioContext + mic.
  // iOS may refuse without a gesture — that is fine; Allow stays available.
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    let cancelled = false;
    void (async () => {
      try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
      try { if (!voiceEnabled()) setVoiceEnabled(true); } catch { /* ignore */ }
      try { primeChatStartGesture(); } catch { /* ignore */ }
      if (!listenSupported()) {
        if (!cancelled) setMic('unsupported');
        return;
      }
      const outcome = await requestMic();
      if (!cancelled) setMic(outcome);
    })();
    return () => { cancelled = true; };
  }, []);

  const speakerOk = soundTested && !isMasterMuted() && voiceEnabled();
  const micOk = mic === 'granted' || mic === 'unsupported';

  const enter = useCallback(() => {
    primeChatStartGesture();
    const micOutcome: MicOutcome =
      mic === 'pending' ? 'skipped' : mic;
    if (micOutcome === 'granted') setMicPreflightSession(true);
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
  }, [heard, mic, nextHref, onDone, router, speakerOk]);

  const continueLabel =
    nextHref === '/chat' || nextHref.startsWith('/chat?')
      ? t(lang, 'preChatEnterChat')
      : t(lang, 'next');

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

        <button
          type="button"
          data-testid="pre-chat-test-sound"
          disabled={playing}
          onClick={() => void playSample()}
          className="ui-btn mt-3 h-12 w-full rounded-full bg-white font-semibold text-black"
        >
          {playing ? t(lang, 'gateAudioPlaying') : t(lang, 'gateAudioTest')}
        </button>

        {isMasterMuted() && soundTested && (
          <p className="mt-2 text-xs text-amber-100/90">{t(lang, 'preChatUnmuteHint')}</p>
        )}

        {soundUi === 'asked' && (
          <div data-testid="pre-chat-hear-ask" className="mt-4 space-y-3">
            <p className="text-sm text-white/80">{t(lang, 'gateAudioQuestion')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                data-testid="pre-chat-hear-yes"
                onClick={() => {
                  setHeard('yes');
                  setSoundUi('ok');
                }}
                className="ui-btn h-11 flex-1 rounded-full bg-emerald-400/90 font-semibold text-neutral-950"
              >
                {t(lang, 'gateAudioYes')}
              </button>
              <button
                type="button"
                data-testid="pre-chat-hear-no"
                onClick={() => {
                  setHeard('no');
                  setSoundUi('help');
                }}
                className="ui-btn h-11 flex-1 rounded-full border border-white/25 bg-white/10 font-semibold text-white"
              >
                {t(lang, 'gateAudioNo')}
              </button>
            </div>
          </div>
        )}

        {soundUi === 'ok' && (
          <p
            data-testid="pre-chat-hear-ok"
            className="mt-4 rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-3 text-sm text-emerald-50"
          >
            {t(lang, 'preChatHeardOk')}
          </p>
        )}

        {soundUi === 'help' && (
          <div
            data-testid="pre-chat-hear-help"
            className="mt-4 space-y-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-50"
          >
            <p className="font-semibold">{t(lang, 'gateHelpTitle')}</p>
            <ul className="list-disc space-y-2 pl-5 text-amber-50/90">
              <li>{t(lang, 'gateHelpSwitch')}</li>
              <li>{t(lang, 'gateHelpVolume')}</li>
              <li>{t(lang, 'gateHelpBluetooth')}</li>
              <li>{t(lang, 'gateHelpTabMuted')}</li>
            </ul>
            <p className="text-xs text-amber-100/80">{t(lang, 'gateHelpNote')}</p>
            <button
              type="button"
              data-testid="pre-chat-hear-retry"
              disabled={playing}
              onClick={() => void playSample()}
              className="ui-btn h-10 w-full rounded-full bg-white font-semibold text-black"
            >
              {t(lang, 'gateHelpRetry')}
            </button>
          </div>
        )}

        {/* Mic optional: permission button only — no composer / typing field. */}
        <section data-testid="pre-chat-mic-section" aria-labelledby="pre-chat-mic-heading" className="mt-5 space-y-3">
          <div className="space-y-2">
            <h2 id="pre-chat-mic-heading" className="text-sm font-semibold text-white/90">
              {t(lang, 'gateMicTitle')}
            </h2>
            <p className="text-xs text-white/55">{t(lang, 'gateMicBody')}</p>
          </div>

          {mic !== 'pending' && (
            <p
              role="status"
              data-testid="pre-chat-mic-result"
              data-outcome={mic}
              className="text-sm text-white/75"
            >
              {mic === 'granted' && t(lang, 'gateMicGranted')}
              {mic === 'denied' && t(lang, 'gateMicDenied')}
              {mic === 'unsupported' && t(lang, 'gateMicUnsupported')}
              {mic === 'skipped' && t(lang, 'gateMicDenied')}
            </p>
          )}

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

        {!speakerOk || !micOk ? (
          <p className="mt-4 text-xs text-white/45">{t(lang, 'setupSoundFailLead')}</p>
        ) : null}

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
