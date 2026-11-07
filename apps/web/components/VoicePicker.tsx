'use client';
// One button per shipping Edge Neural voice. Grouped by language, then gender
// (female group first, then male) so Settings shows the same full numbered set
// as the select board's TtsVoiceRow. A tap previews that voice and pins it
// under the BUTTON's own gender slot, then switches the companion language to
// the voice's locale. Opposite-gender buttons are auditionable, not blocked.

import { useState } from 'react';
import {
  EDGE_VOICE_BUTTONS,
  type EdgeVoiceButton,
  type VoiceGender,
  type VoiceLocale,
} from '../lib/voice-catalog';
import { loadVoicePicks, saveVoicePick, voicePickFor, type VoicePickMap } from '../lib/voice-picks';
import { previewEdgeVoice } from '../lib/voice';
import { resolveEdgeVoice } from '../lib/edge-tts';
import { t, type Lang } from '../lib/prefs';

const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];
const GENDERS: readonly VoiceGender[] = ['female', 'male'];

export default function VoicePicker({
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
  const [picks, setPicks] = useState<VoicePickMap>(() => loadVoicePicks());
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const onTap = (button: EdgeVoiceButton) => {
    // Same pin rule as TtsVoiceRow: the button's own gender owns the pin.
    const next = saveVoicePick(button.locale, button.gender, button.id);
    setPicks(next);
    setFailed(null);
    setPlaying(button.id);
    if (button.locale !== lang) onLang(button.locale);
    void previewEdgeVoice(button.locale, button.id)
      .then(() => setPlaying((id) => (id === button.id ? null : id)))
      .catch(() => {
        setPlaying((id) => (id === button.id ? null : id));
        setFailed(button.label);
      });
  };

  const genderLabel = (gender: VoiceGender) => t(lang, gender === 'female' ? 'genderFemale' : 'genderMale');

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-white/85">{t(lang, 'voicePickerTitle')}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t(lang, 'voicePickerHint')}</p>
      </div>
      {LOCALES.map((locale) => {
        const rows = EDGE_VOICE_BUTTONS.filter((b) => b.locale === locale);
        const language = rows[0]?.language ?? locale;
        const pinnedFemale = voicePickFor(locale, 'female') ?? picks[locale]?.female ?? null;
        const pinnedMale = voicePickFor(locale, 'male') ?? picks[locale]?.male ?? null;
        const castId = resolveEdgeVoice({
          lang: locale,
          gender: companionGender,
          character: characterId,
          ignoreVoicePick: true,
        }).name;
        const companionPinned = companionGender === 'female' ? pinnedFemale : pinnedMale;
        return (
          <div key={locale} className="space-y-1.5">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{language}</h4>
            {/* Full locale set: female group, then male. Both genders stay tappable. */}
            {GENDERS.map((gender) => {
              const group = rows.filter((b) => b.gender === gender);
              if (!group.length) return null;
              const pinnedForGender = gender === 'female' ? pinnedFemale : pinnedMale;
              return (
                <div key={gender} className="space-y-1">
                  <h5 className="text-[10px] uppercase tracking-[0.12em] text-white/35">{genderLabel(gender)}</h5>
                  <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
                    {group.map((button) => {
                      const numLabel = `#${button.n} ${button.label}`;
                      const castMatch =
                        button.gender === companionGender && button.id === castId && !companionPinned;
                      const selected = button.id === pinnedForGender || castMatch;
                      const live = playing === button.id;
                      return (
                        <button
                          key={button.id}
                          type="button"
                          aria-label={numLabel}
                          aria-pressed={selected}
                          title={`${button.label} (${button.gender} #${button.n})`}
                          data-voice-n={button.n}
                          data-voice-gender={button.gender}
                          onClick={() => onTap(button)}
                          className={`ui-btn min-h-11 rounded-xl border px-2.5 py-1.5 text-left leading-tight ${
                            selected ? 'border-white/80 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                          }`}
                          style={selected ? { backgroundColor: `${accent}33`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
                        >
                          <span className="block text-[12px] font-medium">{numLabel}</span>
                          {button.note && (
                            <span className="block text-[10px] text-white/45">{button.note}</span>
                          )}
                          {live && <span className="block text-[10px] text-white/55">…</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {failed && <p className="text-[10px] text-white/45">{failed}</p>}
    </div>
  );
}
