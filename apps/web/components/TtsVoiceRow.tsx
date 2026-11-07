'use client';
// Edge voice row on the select board: Tier A Edge voices as small buttons.
// Shows the FULL locale set (male + female, numbered). Tap previews immediately
// (mute-aware via playVoiceGreeting → stopSpeaking). Pin is per voice gender.

import { useEffect, useState } from 'react';
import { resolveEdgeVoice } from '../lib/edge-tts';
import { selectTtsButtons, ttsButtonKey, type TtsButtonVoice } from '../lib/tts-button-registry';
import { playVoiceGreeting } from '../lib/voice';
import { saveVoicePick, voicePickFor } from '../lib/voice-picks';
import { isDevMode, devMark } from '../lib/dev-mode';
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
  const [showDev, setShowDev] = useState(false);
  useEffect(() => { setShowDev(isDevMode()); }, []);
  // Mon t533/t534: full distinct numbered voices including males — do not
  // hide opposite-sex Edge ids from the language section.
  const buttons = showAll
    ? selectTtsButtons(undefined)
    : selectTtsButtons(lang);
  const pinnedFemale = voicePickFor(lang, 'female');
  const pinnedMale = voicePickFor(lang, 'male');
  const castId = resolveEdgeVoice({
    lang,
    gender: companionGender,
    character: characterId,
    ignoreVoicePick: true,
  }).name;
  const companionPinned = companionGender === 'female' ? pinnedFemale : pinnedMale;
  const activeCompanionId = companionPinned ?? castId;

  const onTap = (button: TtsButtonVoice) => {
    // Pin under the button's own gender slot (male pins stay male).
    saveVoicePick(button.locale, button.gender, button.id);
    setRev((n) => n + 1);
    if (button.locale !== lang) onLang(button.locale);
    playVoiceGreeting(characterId, button.locale, button.id);
  };

  return (
    <section role="group" aria-labelledby="amoji-tts-voice-title" className="pointer-events-auto w-full min-w-0" data-testid="tts-voice-row" data-rev={rev}>
      <div className="mb-1 flex items-center justify-center gap-2">
        <h2 id="amoji-tts-voice-title" className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          {t(lang, 'chooseVoice')}
        </h2>
        <button
          type="button"
          aria-pressed={showAll}
          aria-label={showAll ? t(lang, 'voiceThisLanguage') : t(lang, 'voiceShowAll')}
          data-dev={showDev ? 'V0' : undefined}
          onClick={() => setShowAll((on) => !on)}
          className="fx-press relative rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/70"
        >
          {showAll ? t(lang, 'voiceThisLanguage') : t(lang, 'voiceShowAll')}
        </button>
      </div>
      <div className="max-h-[5.5rem] w-full overflow-y-auto overscroll-contain sm:max-h-[7.5rem]">
        <div className="flex w-full flex-wrap justify-center gap-1">
          {buttons.map((button, i) => {
            const pinnedForGender = button.gender === 'female' ? pinnedFemale : pinnedMale;
            const castMatch = button.gender === companionGender && button.id === castId && !companionPinned;
            const selected = button.locale === lang && (button.id === pinnedForGender || castMatch || (button.gender === companionGender && button.id === activeCompanionId && !pinnedForGender));
            const mark = devMark('V', i + 1);
            const numLabel = `#${button.n} ${button.label}`;
            return (
              <button
                key={ttsButtonKey(button)}
                type="button"
                aria-label={numLabel}
                aria-pressed={selected}
                title={`${button.id} (${button.gender} #${button.n})`}
                data-dev={showDev ? mark : undefined}
                data-voice-n={button.n}
                data-voice-gender={button.gender}
                onClick={() => onTap(button)}
                className={`fx-press ui-btn relative shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                  selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
                }`}
                style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                {showDev ? `${mark} ${numLabel}` : numLabel}
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
      </div>
    </section>
  );
}
