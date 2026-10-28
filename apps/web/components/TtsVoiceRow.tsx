'use client';
// Last row on the select board: small engine/voice buttons, not portrait cards.
// The list is the shipping slice of the TTS registry, so a later free-engine
// PR only appends voices — this row does not grow new card chrome.

import { useState } from 'react';
import { resolveEdgeVoice } from '../lib/edge-tts';
import { selectTtsButtons, ttsButtonKey, type TtsButtonVoice } from '../lib/tts-button-registry';
import { playSelectGreeting } from '../lib/voice';
import { saveVoicePick, voicePickFor } from '../lib/voice-picks';
import { t, type Lang } from '../lib/prefs';

export default function TtsVoiceRow({
  lang,
  characterId,
  companionGender,
  accent,
  onLang,
}: {
  lang: Lang;
  characterId: string;
  companionGender: 'female' | 'male';
  accent: string;
  onLang: (lang: Lang) => void;
}) {
  const [rev, setRev] = useState(0);
  const buttons = selectTtsButtons();
  const pinned = voicePickFor(lang, companionGender);
  const castId = resolveEdgeVoice({
    lang,
    gender: companionGender,
    character: characterId,
    ignoreVoicePick: true,
  }).name;
  const activeId = pinned ?? castId;

  const onTap = (button: TtsButtonVoice) => {
    if (button.engine === 'edge') saveVoicePick(button.locale, companionGender, button.id);
    setRev((n) => n + 1);
    if (button.locale !== lang) onLang(button.locale);
    playSelectGreeting(characterId, button.locale, button.gender);
  };

  return (
    <section className="pointer-events-auto w-full min-w-0" data-testid="tts-voice-row" data-rev={rev}>
      <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
        {t(lang, 'chooseVoice')}
      </h2>
      <div className="flex w-full gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {buttons.map((button) => {
          const selected = button.locale === lang && button.id === activeId;
          return (
            <button
              key={ttsButtonKey(button)}
              type="button"
              aria-label={button.label}
              aria-pressed={selected}
              title={button.label}
              onClick={() => onTap(button)}
              className={`fx-press ui-btn shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
              }`}
              style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              {button.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
