'use client';
// Edge voice row on the select board: the 28 Tier A Edge voices as small buttons.
// Filtered to the current language (yue 3, zh 6, ja 2, en 17). "All" shows
// every Tier A id. No numbered buttons for engines that do not have a speaker id.

import { useState } from 'react';
import { resolveEdgeVoice } from '../lib/edge-tts';
import { selectTtsButtons, ttsButtonKey, type TtsButtonVoice } from '../lib/tts-button-registry';
import { playVoiceGreeting } from '../lib/voice';
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
  const [showAll, setShowAll] = useState(false);
  const buttons = showAll ? selectTtsButtons() : selectTtsButtons(lang);
  const pinned = voicePickFor(lang, companionGender);
  const castId = resolveEdgeVoice({
    lang,
    gender: companionGender,
    character: characterId,
    ignoreVoicePick: true,
  }).name;
  const activeId = pinned ?? castId;

  const onTap = (button: TtsButtonVoice) => {
    saveVoicePick(button.locale, companionGender, button.id);
    setRev((n) => n + 1);
    if (button.locale !== lang) onLang(button.locale);
    playVoiceGreeting(characterId, button.locale, button.id);
  };

  return (
    <section className="pointer-events-auto w-full min-w-0" data-testid="tts-voice-row" data-rev={rev}>
      <div className="mb-1 flex items-center justify-center gap-2">
        <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          {t(lang, 'chooseVoice')}
        </h2>
        <button
          type="button"
          aria-pressed={showAll}
          onClick={() => setShowAll((on) => !on)}
          className="fx-press rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
        >
          {showAll ? t(lang, 'voiceThisLanguage') : t(lang, 'voiceShowAll')}
        </button>
      </div>
      <div className="flex w-full flex-wrap justify-center gap-1">
        {buttons.map((button) => {
          const selected = button.locale === lang && button.id === activeId;
          return (
            <button
              key={ttsButtonKey(button)}
              type="button"
              aria-label={button.label}
              aria-pressed={selected}
              title={button.id}
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
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="shrink-0 cursor-default rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] text-white/40"
        >
          {t(lang, 'moreEnginesLater')}
        </button>
      </div>
    </section>
  );
}
