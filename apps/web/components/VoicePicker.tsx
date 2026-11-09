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

import { useCallback, useState } from 'react';
import { selectTtsButtons, type TtsButtonVoice } from '../lib/tts-button-registry';
import { isSingleVoiceLocale } from '../lib/tts-button-registry';
import { activeVoiceChoice, loadVoicePicks, saveVoicePick, type VoicePickMap } from '../lib/voice-picks';
import { previewVoiceChoice, previewOsVoice } from '../lib/voice';
import { t, type Lang } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';
import OsVoiceRow from './OsVoiceRow';
import OsVoiceDiagnostics from './OsVoiceDiagnostics';
import TtsLabPanel from './TtsLabPanel';

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
  const [showDiag, setShowDiag] = useState(false);
  /**
   * How many OS voices this device contributes per language. Used only to keep
   * the "one available voice" note from contradicting the device row directly
   * beneath it — the note is about the HOSTED tier, and saying "one" while four
   * device voices are on screen is the kind of half-truth this picker exists to
   * avoid.
   */
  const [osUsable, setOsUsable] = useState<Partial<Record<VoiceLocale, { female: number; male: number }>>>({});

  const reportOs = useCallback((locale: VoiceLocale, usable: { female: number; male: number }) => {
    setOsUsable((prev) => {
      const cur = prev[locale];
      if (cur && cur.female === usable.female && cur.male === usable.male) return prev;
      return { ...prev, [locale]: usable };
    });
  }, []);

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
        const os = osUsable[locale];
        const osVoiceCount = os ? os.female + os.male : 0;
        // "One available voice" is true of the hosted tier and false of the
        // screen once device voices are below it, so the note is suppressed
        // whenever the device contributes any voice of its own.
        const hostedOnly = isSingleVoiceLocale(locale) && osVoiceCount === 0;
        return (
          <div key={locale} role="group" aria-labelledby={`amoji-voice-locale-${locale}`} className="space-y-1.5">
            <h4 id={`amoji-voice-locale-${locale}`} className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              {LANGUAGE_LABEL[locale]}
            </h4>
            <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
              {rows.map((button) => {
                const genderLabel = button.deliveryGender === 'male'
                  ? t(lang, 'voiceFreeMale')
                  : t(lang, 'voiceFreeFemale');
                const numLabel = `#${button.n} ${t(lang, button.labelKey)} · ${genderLabel}`;
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
            {hostedOnly && (
              <p
                className="text-[10px] leading-relaxed text-white/40"
                data-testid={`voice-single-note-${locale}`}
              >
                {t(lang, 'voiceOnlyOneAvailable')}
              </p>
            )}
            {/* The OS's own voices. They are a genuinely different speaker from
                the Google tier, and on desktop there are often several per
                gender — so they go here, under the hosted voices, labelled as
                coming from the device rather than the network. */}
            <OsVoiceRow
              locale={locale}
              lang={lang}
              accent={accent}
              onInventory={(usable) => reportOs(locale, usable)}
              onPreview={(voice) => {
                if (voice.gender === 'unknown') return;
                if (locale !== lang) onLang(locale);
                void previewOsVoice(locale, voice.name, voice.gender);
              }}
            />
          </div>
        );
      })}
      <p className="text-[10px] leading-relaxed text-white/35" data-testid="voice-engines-note">
        {t(lang, 'voiceEnginesUnavailable')}
      </p>
      <TtsLabPanel lang={lang} accent={accent} />
      {/* The diagnostic the user can point at when they ask "why do I only hear
          one voice?". Collapsed by default so the picker stays short. */}
      <div>
        <button
          type="button"
          aria-expanded={showDiag}
          onClick={() => setShowDiag((on) => !on)}
          className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] text-white/70"
          data-testid="os-voice-diag-toggle"
        >
          {t(lang, 'osVoicesDiagTitle')}
        </button>
      </div>
      {showDiag && <OsVoiceDiagnostics lang={lang} accent={accent} />}
    </div>
  );
}
