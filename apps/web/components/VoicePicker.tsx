'use client';
// Settings → Voice. One button per voice this app can actually play.
//
// This used to list every Edge neural short name — 58 of them — grouped by
// language and gender. The Edge read-aloud endpoint refuses this app, so all 58
// produced the same fallback audio and the picker was a wall of buttons that
// could not change what you heard.
//
// It now lists the voices that really differ, per language, and states the
// engine verdict for everything that does not work, so the short list is
// explained rather than mysterious.

import { useState } from 'react';
import { selectTtsButtons, type TtsButtonVoice } from '../lib/tts-button-registry';
import { isSingleVoiceLocale } from '../lib/tts-button-registry';
import { activeVoiceChoice, loadVoicePicks, saveVoicePick, type VoicePickMap } from '../lib/voice-picks';
import { previewVoiceChoice } from '../lib/voice';
import { t, type Lang } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';

const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];
/** Native names, so the language itself is readable in any UI language. */
const LANGUAGE_LABEL: Record<VoiceLocale, string> = {
  yue: '廣東話',
  zh: '中文',
  ja: '日本語',
  en: 'English',
};

export default function VoicePicker({
  lang,
  characterId,
  accent,
  onLang,
}: {
  lang: Lang;
  characterId: string;
  /** Kept for call-site compatibility; the live voices are not gendered. */
  companionGender?: 'female' | 'male';
  accent: string;
  onLang: (lang: Lang) => void;
}) {
  const [picks, setPicks] = useState<VoicePickMap>(() => loadVoicePicks());
  const [playing, setPlaying] = useState<string | null>(null);

  const onTap = (button: TtsButtonVoice) => {
    const next = saveVoicePick(button.locale, button.id);
    setPicks(next);
    setPlaying(button.id);
    if (button.locale !== lang) onLang(button.locale);
    void previewVoiceChoice(button.locale, button.id)
      .then(() => setPlaying((id) => (id === button.id ? null : id)))
      .catch(() => setPlaying((id) => (id === button.id ? null : id)));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-white/85">{t(lang, 'voicePickerTitle')}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t(lang, 'voicePickerHint')}</p>
      </div>
      {LOCALES.map((locale) => {
        const rows = selectTtsButtons(locale);
        const activeId = picks[locale] ?? activeVoiceChoice(locale).id;
        return (
          <div key={locale} role="group" aria-labelledby={`amoji-voice-locale-${locale}`} className="space-y-1.5">
            <h4 id={`amoji-voice-locale-${locale}`} className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              {LANGUAGE_LABEL[locale]}
            </h4>
            <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
              {rows.map((button) => {
                const numLabel = `#${button.n} ${t(lang, button.labelKey)}`;
                const selected = button.id === activeId;
                const live = playing === button.id;
                return (
                  <button
                    key={button.id}
                    type="button"
                    aria-label={numLabel}
                    aria-pressed={selected}
                    title={button.tl}
                    data-voice-n={button.n}
                    data-voice-id={button.id}
                    onClick={() => onTap(button)}
                    className={`ui-btn min-h-11 rounded-xl border px-2.5 py-1.5 text-left leading-tight ${
                      selected ? 'border-white/80 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                    style={selected ? { backgroundColor: `${accent}33`, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
                  >
                    <span className="block text-[12px] font-medium">{numLabel}</span>
                    {live && <span className="block text-[10px] text-white/55">…</span>}
                  </button>
                );
              })}
            </div>
            {isSingleVoiceLocale(locale) && (
              <p
                className="text-[10px] leading-relaxed text-white/40"
                data-testid={`voice-single-note-${locale}`}
              >
                {t(lang, 'voiceOnlyOneAvailable')}
              </p>
            )}
          </div>
        );
      })}
      <p className="text-[10px] leading-relaxed text-white/35" data-testid="voice-engines-note">
        {t(lang, 'voiceEnginesUnavailable')}
      </p>
    </div>
  );
}
