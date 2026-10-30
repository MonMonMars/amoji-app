'use client';
// Edge voice row on the select board: Tier A Edge voices as small buttons.
// Preview on tap and on focus/hover highlight. EN wraps inside a scroll box
// so Start stays reachable.

import { useEffect, useRef, useState } from 'react';
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
  const previewKey = useRef<string | null>(null);
  const buttons = showAll ? selectTtsButtons() : selectTtsButtons(lang);
  const pinned = voicePickFor(lang, companionGender);
  const castId = resolveEdgeVoice({
    lang,
    gender: companionGender,
    character: characterId,
    ignoreVoicePick: true,
  }).name;
  const activeId = pinned ?? castId;

  const preview = (button: TtsButtonVoice, pin: boolean) => {
    const key = ttsButtonKey(button);
    if (!pin && previewKey.current === key) return;
    previewKey.current = key;
    if (pin) {
      saveVoicePick(button.locale, companionGender, button.id);
      setRev((n) => n + 1);
      if (button.locale !== lang) onLang(button.locale);
    }
    playVoiceGreeting(characterId, button.locale, button.id);
  };

  const onTap = (button: TtsButtonVoice) => preview(button, true);

  return (
    <section className="pointer-events-auto w-full min-w-0" data-testid="tts-voice-row" data-rev={rev}>
      <div className="mb-1 flex items-center justify-center gap-2">
        <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
          {t(lang, 'chooseVoice')}
        </h2>
        <button
          type="button"
          aria-pressed={showAll}
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
            const selected = button.locale === lang && button.id === activeId;
            const mark = devMark('V', i + 1);
            return (
              <button
                key={ttsButtonKey(button)}
                type="button"
                aria-label={button.label}
                aria-pressed={selected}
                title={button.id}
                data-dev={showDev ? mark : undefined}
                onClick={() => onTap(button)}
                onFocus={() => preview(button, false)}
                onMouseEnter={() => preview(button, false)}
                className={`fx-press ui-btn relative shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
                  selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
                }`}
                style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                {showDev ? `${mark} ${button.label}` : button.label}
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
