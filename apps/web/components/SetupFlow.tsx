'use client';
// Grok-ani style 3-step setup: character → scene → language → start.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrefs, t, savePrefs, type Prefs } from '../lib/prefs';
import { primeChatStartGesture } from '../lib/chat-start-gesture';
import { locationPreflightDoneThisSession } from '../lib/location-preflight';
import { primeLocationForChatEnter } from '../lib/live-tools';
import { playVoiceGreeting } from '../lib/voice';
import { activeVoiceChoice } from '../lib/voice-picks';
import { CharacterGrid, BackgroundGrid, LangChips } from './selectors';

const STEPS = ['character', 'background', 'language'] as const;

export default function SetupFlow() {
  const router = useRouter();
  const [prefs, setPrefs, prefsReady] = usePrefs();
  const [step, setStep] = useState(0);
  const lang = prefs.lang;
  const stepLabel = (n: number, total: number) =>
    t(lang, 'setupStepOf', { n: String(n), total: String(total) });
  const patch = (p: Partial<Prefs>) => setPrefs(p);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      primeChatStartGesture();
      if (!locationPreflightDoneThisSession()) {
        window.setTimeout(() => { try { primeLocationForChatEnter(); } catch { /* ignore */ } }, 120);
      }
      savePrefs(prefs);
      router.push('/chat');
    }
  };

  return (
    <main
      className={`flex w-full max-w-2xl flex-col items-center gap-6 px-4 ${prefsReady ? '' : 'opacity-0'}`}
      aria-busy={!prefsReady}
      aria-labelledby="amoji-setup-title"
    >
      <div role="group" aria-label={t(lang, 'setupProgress')} className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <span
            key={i}
            aria-label={stepLabel(i + 1, STEPS.length)}
            aria-current={i === step ? 'step' : undefined}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-white' : 'w-1.5 bg-white/30'}`}
          />
        ))}
      </div>

      <h1 id="amoji-setup-title" className="text-center text-2xl font-bold text-white">
        {step === 0 && t(lang, 'chooseCharacter')}
        {step === 1 && t(lang, 'chooseBackground')}
        {step === 2 && t(lang, 'chooseLanguage')}
      </h1>

      <div className="w-full">
        {step === 0 && <CharacterGrid lang={lang} value={prefs.character} onChange={(id) => patch({ character: id })} />}
        {step === 1 && <BackgroundGrid lang={lang} value={prefs.background} onChange={(id) => patch({ background: id })} />}
        {step === 2 && (
          <LangChips
            value={prefs.lang}
            onChange={(l) => {
              patch({ lang: l });
              playVoiceGreeting(prefs.character, l, activeVoiceChoice(l).id);
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} aria-label={t(lang, 'back')} className="rounded-full bg-white/10 px-5 py-2.5 text-sm text-white/80 hover:bg-white/20">
            {t(lang, 'back')}
          </button>
        )}
        <button
          type="button"
          onClick={next}
          aria-label={step < STEPS.length - 1 ? t(lang, 'next') : t(lang, 'startChat')}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-white/85"
        >
          {step < STEPS.length - 1 ? '→' : t(lang, 'startChat')}
        </button>
      </div>
    </main>
  );
}
