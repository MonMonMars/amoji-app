'use client';
// Slide-over settings sheet, reachable from the chat room (⚙ top right).
// Holds voice toggles, language, memory (🧠 moved here), how-to-use, revision.
import { useRef, useState } from 'react';
import { t, type Prefs } from '../lib/prefs';
import { LangChips } from './selectors';
import { speak, voiceEnabled, setVoiceEnabled, neuralEnabled, setNeuralEnabled } from '../lib/voice';
import { pickLine } from '../lib/chatter';
import { feedUtterance } from '../lib/companion';
import { notifySpeaking } from '../lib/speech';
import { APP_REVISION } from '../lib/revision';

function Toggle({ on, onClick, accent }: { on: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? '' : 'bg-white/15'}`}
      style={on ? { backgroundColor: accent } : undefined}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export default function SettingsSheet({
  open,
  prefs,
  onChange,
  onClose,
  memCount,
  onForget,
}: {
  open: boolean;
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onClose: () => void;
  memCount: number;
  onForget: () => void;
}) {
  const [voiceOn, setVoiceOnState] = useState(voiceEnabled());
  const [neuralOn, setNeuralOnState] = useState(neuralEnabled());
  const tutorNRef = useRef(0);
  if (!open) return null;
  const lang = prefs.lang;
  const accent = '#f9a8d4';

  const row = 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3';
  const label = 'text-sm text-white/85';

  const tutor = () => {
    const line = pickLine('tutor', lang, tutorNRef.current++);
    feedUtterance(line);
    notifySpeaking(line);
    speak(line, prefs.character, lang);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-neutral-950/90 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t(lang, 'settings')}</h2>
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">✕</button>
        </div>

        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'voiceReplies')}</h3>
            <div className={row}>
              <span className={label}>🔊 {t(lang, 'voiceReplies')}</span>
              <Toggle
                on={voiceOn}
                accent={accent}
                onClick={() => { const next = !voiceOn; setVoiceOnState(next); setVoiceEnabled(next); }}
              />
            </div>
            <div className={row}>
              <span className={label}>✨ {t(lang, 'neuralVoice')}</span>
              <Toggle
                on={neuralOn}
                accent={accent}
                onClick={() => { const next = !neuralOn; setNeuralOnState(next); setNeuralEnabled(next); }}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'chooseLanguage')}</h3>
            <LangChips value={prefs.lang} onChange={(l) => onChange({ lang: l })} />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'memoryTitle')}</h3>
            <div className={row}>
              <span className={label}>🧠 {t(lang, 'memoryTitle')}
                <span className="ml-2 text-xs text-white/40">{memCount > 0 ? `${memCount}` : '—'}</span>
              </span>
              <button
                onClick={() => {
                  if (window.confirm('Forget everything she remembers about you?\n要佢忘記晒所有關於你嘅記憶？')) onForget();
                }}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20"
              >
                {t(lang, 'forgetBtn')}
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <button onClick={tutor} className={`${row} w-full text-left transition hover:bg-white/10`}>
              <span className={label}>❓ {t(lang, 'tutorBtn')}</span>
              <span className="text-white/30">→</span>
            </button>
          </section>

          <p className="pt-2 text-center text-[11px] text-white/25">Amoji · {APP_REVISION}</p>
        </div>
      </div>
    </div>
  );
}
