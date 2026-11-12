'use client';
// The voice row on the select board: one button per voice this language can
// ACTUALLY produce.
//
// It used to render 58 Edge neural buttons (male+female, numbered) which all
// played the same audio, because the Edge read-aloud endpoint refuses this app
// and every tap fell through to the one Google Translate voice for that
// language. Ten buttons, one sound.
//
// Now the row is driven by tts-button-registry, which is gated on the engine
// audit: a dead or unbundled engine cannot appear here. Some languages end up
// with a short pair — Japanese is one Google speaker × female/male delivery —
// and when that happens the row says so plainly. An Add button pulls optional
// test-pool voices for the current language.

import { useEffect, useState } from 'react';
import {
  isSingleVoiceLocale,
  selectTtsButtons,
  ttsButtonKey,
  type TtsButtonVoice,
} from '../lib/tts-button-registry';
import { addVoiceOption, voiceAddRemaining } from '../lib/voice-capability';
import { playVoiceGreeting } from '../lib/voice';
import { saveVoicePick, voicePickFor, activeVoiceChoice } from '../lib/voice-picks';
import { isDevMode, devMark } from '../lib/dev-mode';
import { t, type Lang } from '../lib/prefs';

export default function TtsVoiceRow({
  lang,
  characterId,
  accent,
  onLang,
}: {
  lang: Lang;
  characterId: string;
  /** Kept for call-site compatibility; free delivery gender is per button. */
  companionGender?: 'female' | 'male';
  accent: string;
  onLang: (lang: Lang) => void;
}) {
  const [rev, setRev] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [addNote, setAddNote] = useState<string | null>(null);
  useEffect(() => { setShowDev(isDevMode()); }, []);

  const buttons = showAll ? selectTtsButtons() : selectTtsButtons(lang);
  const pinnedId = voicePickFor(lang);
  const activeId = pinnedId ?? activeVoiceChoice(lang).id;
  const single = !showAll && isSingleVoiceLocale(lang);
  const canAdd = voiceAddRemaining(lang) > 0;

  const onTap = (button: TtsButtonVoice) => {
    saveVoicePick(button.locale, button.id);
    setRev((n) => n + 1);
    if (button.locale !== lang) onLang(button.locale);
    playVoiceGreeting(characterId, button.locale, button.id);
  };

  const onAdd = () => {
    const added = addVoiceOption(lang);
    if (!added) {
      setAddNote(t(lang, 'voiceAddNone'));
      return;
    }
    setAddNote(null);
    saveVoicePick(lang, added.id);
    setRev((n) => n + 1);
    playVoiceGreeting(characterId, lang, added.id);
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
        <button
          type="button"
          data-testid="tts-voice-add"
          aria-label={t(lang, 'voiceAdd')}
          title={t(lang, 'voiceAddHint')}
          disabled={!canAdd}
          onClick={onAdd}
          className={`fx-press relative rounded-full border px-2 py-0.5 text-[10px] ${
            canAdd
              ? 'border-white/25 bg-black/30 text-white/80'
              : 'cursor-not-allowed border-white/10 bg-transparent text-white/30'
          }`}
        >
          {t(lang, 'voiceAdd')}
        </button>
      </div>
      <div className="w-full" data-testid="tts-voice-grid">
        <div className="grid w-full grid-cols-2 gap-1 min-[420px]:grid-cols-3 sm:grid-cols-4">
          {buttons.map((button) => {
            const selected = button.locale === lang && button.id === activeId;
            const mark = devMark('V', button.n);
            const genderLabel = button.deliveryGender === 'male'
              ? t(lang, 'voiceFreeMale')
              : t(lang, 'voiceFreeFemale');
            const numLabel = `#${button.n} ${t(lang, button.labelKey)} · ${genderLabel}`;
            return (
              <button
                key={ttsButtonKey(button)}
                type="button"
                aria-label={numLabel}
                aria-pressed={selected}
                title={`${t(lang, button.labelKey)} · ${button.tl}`}
                data-dev={showDev ? mark : undefined}
                data-voice-n={button.n}
                data-voice-id={button.id}
                onClick={() => onTap(button)}
                className={`fx-press ui-btn relative min-h-9 rounded-xl border px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${
                  selected ? 'border-white/80 text-white' : 'border-white/15 bg-black/35 text-white/80'
                }`}
                style={selected ? { backgroundColor: `${accent}55`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
              >
                {showDev ? `${mark} ${numLabel}` : numLabel}
              </button>
            );
          })}
        </div>
        {addNote && (
          <p role="status" className="mt-1 px-1 text-center text-[10px] leading-relaxed text-white/45" data-testid="tts-voice-add-note">
            {addNote}
          </p>
        )}
        {single && (
          <p
            role="status"
            className="mt-1 px-1 text-center text-[10px] leading-relaxed text-white/45"
            data-testid="tts-voice-single-note"
          >
            {t(lang, 'voiceOnlyOneAvailable')}
          </p>
        )}
      </div>
    </section>
  );
}
