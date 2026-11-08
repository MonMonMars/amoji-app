'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { loadPrefs, t, type Lang } from '../lib/prefs';
import { testVoiceChain, setVoiceEnabled, voiceEnabled } from '../lib/voice';
import { isMasterMuted, setMasterMuted } from '../lib/master-mute';
import { listenSupported } from '../lib/listen';
import { requestMic } from '../lib/mic-preflight';
import { setMicPreflightSession, type MicOutcome } from '../lib/entry-gate';
import { markChatAudioReady, stashPriorMasterMuteForChat } from '../lib/pre-chat-audio';
import { primeChatStartGesture } from '../lib/chat-start-gesture';
import EarlyAudioUnlock from './EarlyAudioUnlock';

export default function PreChatAudioGate({
  onDone,
  showBack = true,
  nextHref = '/chat',
}: {
  onDone?: () => void;
  showBack?: boolean;
  nextHref?: string;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en');
  const [soundTested, setSoundTested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mic, setMic] = useState<MicOutcome | 'pending'>('pending');
  const [micBusy, setMicBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setLang(loadPrefs().lang); } catch { /* en */ }
    stashPriorMasterMuteForChat();
    if (!listenSupported()) setMic('unsupported');
  }, []);

  const playSample = useCallback(async () => {
    setPlaying(true);
    try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
    try { if (!voiceEnabled()) setVoiceEnabled(true); } catch { /* ignore */ }
    let characterId = 'a01-shino';
    try { characterId = loadPrefs().character; } catch { /* default */ }
    try {
      await testVoiceChain(characterId, lang);
    } catch {
      /* retryable */
    } finally {
      setPlaying(false);
      setSoundTested(true);
    }
  }, [lang]);

  const allowMic = useCallback(async () => {
    setMicBusy(true);
    setMic(await requestMic());
    setMicBusy(false);
  }, []);

  const speakerOk = soundTested && !isMasterMuted() && voiceEnabled();
  const micOk = mic === 'granted' || mic === 'unsupported';
  const canEnter = speakerOk && micOk;

  const enter = useCallback(() => {
    if (!canEnter) return;
    primeChatStartGesture();
    if (mic === 'granted') setMicPreflightSession(true);
    markChatAudioReady();
    if (onDone) onDone();
    else router.replace(nextHref);
  }, [canEnter, mic, nextHref, onDone, router]);

  return (
    <main data-testid="pre-chat-audio-gate" className="fx-page flex min-h-dvh items-center justify-center bg-neutral-950 px-5 py-8 text-white">
      <EarlyAudioUnlock />
      {showBack && (
        <button type="button" data-testid="pre-chat-audio-back" onClick={() => router.push('/select')} className="ui-btn absolute left-4 top-4">
          ← {t(lang, 'back')}
        </button>
      )}
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-white/[0.04] p-5">
        <h1 className="text-2xl font-bold">{t(lang, 'preChatGateTitle')}</h1>
        <p className="mt-2 text-sm text-white/70">{t(lang, 'preChatGateLead')}</p>
        <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{t(lang, 'gateAudioIosHint')}</p>
        <button type="button" data-testid="pre-chat-test-sound" disabled={playing} onClick={() => void playSample()} className="ui-btn mt-3 h-12 w-full rounded-full bg-white font-semibold text-black">
          {playing ? t(lang, 'gateAudioPlaying') : t(lang, 'gateAudioTest')}
        </button>
        {soundTested && (
          <p className="mt-2 text-xs text-white/55">{isMasterMuted() ? t(lang, 'preChatUnmuteHint') : t(lang, 'preChatSoundOk')}</p>
        )}
        {mic !== 'pending' && (
          <p data-testid="pre-chat-mic-result" data-outcome={mic} className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-3 text-sm">
            {mic === 'granted' && t(lang, 'gateMicGranted')}
            {mic === 'denied' && t(lang, 'gateMicDenied')}
            {mic === 'unsupported' && t(lang, 'gateMicUnsupported')}
          </p>
        )}
        {listenSupported() && mic !== 'granted' && mic !== 'unsupported' && (
          <button type="button" data-testid="pre-chat-mic-allow" disabled={micBusy} onClick={() => void allowMic()} className="ui-btn mt-3 h-11 w-full rounded-full bg-white font-semibold text-black">
            {t(lang, 'gateMicAllow')}
          </button>
        )}
        <button type="button" data-testid="pre-chat-enter-chat" disabled={!canEnter} onClick={enter} className="ui-btn mt-6 h-12 w-full rounded-full bg-emerald-400/90 font-semibold text-neutral-950 disabled:opacity-40">
          {t(lang, 'preChatEnterChat')}
        </button>
      </div>
    </main>
  );
}
