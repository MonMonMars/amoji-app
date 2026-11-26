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
// explained rather than mysterious. Every hosted gTTS speaker is female, so
// the list is all female: no pitched-down "male" button is offered. An Add
// button pulls optional same-bucket regional codes from the test pool for
// auditioning.

import { useCallback, useState } from 'react';
import { selectRelayVoiceButtons, selectTtsButtons, ttsButtonSpeaker, type RelayVoiceButton, type TtsButtonVoice } from '../lib/tts-button-registry';
import { isSingleVoiceLocale } from '../lib/tts-button-registry';
import { activeVoiceChoice, loadVoicePicks, saveVoicePick, type VoicePickMap } from '../lib/voice-picks';
import { addVoiceOption, edgeRelayAvailable, pitchTierLabelKey, voiceAddRemaining } from '../lib/voice-capability';
import { previewVoiceChoice, previewOsVoice } from '../lib/voice';
import { t, type Lang } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';
import OsVoiceRow from './OsVoiceRow';
import OsVoiceDiagnostics from './OsVoiceDiagnostics';
import TtsLabPanel from './TtsLabPanel';
import TtsAppPicksPanel from './TtsAppPicksPanel';

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
  characterId: _characterId,
  companionGender,
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
  const [picks, setPicks] = useState<VoicePickMap>(() => loadVoicePicks());
  const [playing, setPlaying] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [rev, setRev] = useState(0);
  const [addNote, setAddNote] = useState<Partial<Record<VoiceLocale, string>>>({});
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

  const onTap = (button: TtsButtonVoice | RelayVoiceButton) => {
    const next = saveVoicePick(button.locale, button.id);
    setPicks(next);
    setPlaying(button.id);
    if (button.locale !== lang) onLang(button.locale);
    void previewVoiceChoice(button.locale, button.id)
      .then(() => setPlaying((id) => (id === button.id ? null : id)))
      .catch(() => setPlaying((id) => (id === button.id ? null : id)));
  };

  const onAdd = (locale: VoiceLocale) => {
    const added = addVoiceOption(locale);
    if (!added) {
      setAddNote((prev) => ({ ...prev, [locale]: t(lang, 'voiceAddNone') }));
      return;
    }
    setAddNote((prev) => ({ ...prev, [locale]: undefined }));
    setRev((n) => n + 1);
    const next = saveVoicePick(locale, added.id);
    setPicks(next);
    setPlaying(added.id);
    if (locale !== lang) onLang(locale);
    void previewVoiceChoice(locale, added.id)
      .then(() => setPlaying((id) => (id === added.id ? null : id)))
      .catch(() => setPlaying((id) => (id === added.id ? null : id)));
  };

  // Re-read on every render: the relay URL can be changed in Settings, and the
  // Edge breaker can trip after a failed preview. False => no male buttons.
  const relayUp = edgeRelayAvailable();

  return (
    <div className="space-y-3" data-voice-rev={rev}>
      <div>
        <p className="text-sm text-white/85">{t(lang, 'voicePickerTitle')}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t(lang, 'voicePickerHint')}</p>
      </div>
      {!relayUp && (
        <p className="text-[10px] leading-relaxed text-white/40" role="status" data-testid="voice-relay-off">
          {t(lang, 'voiceRelayOff')}
        </p>
      )}
      {LOCALES.map((locale) => {
        const rows = selectTtsButtons(locale);
        // Edge neural male buttons. Empty — not disabled, not silent — when the
        // relay is unavailable, so no male button can exist without audio.
        const maleRows = selectRelayVoiceButtons(locale);
        // A pin can point at a relay male voice that this render no longer
        // offers (relay cleared in Settings, or the Edge breaker tripped). Fall
        // back to the language default so SOME button stays selected instead of
        // leaving a selection the user cannot see.
        const row = picks[locale];
        // Pins are per speaker gender now: a female pin must not select (or
        // hide) the male character's button. No companionGender = legacy read.
        const pinned = companionGender ? row?.[companionGender] : (row?.female ?? row?.male);
        const pinnedRenderable = !!pinned
          && (rows.some((b) => b.id === pinned) || maleRows.some((b) => b.id === pinned));
        const activeId = pinnedRenderable
          ? pinned
          : activeVoiceChoice(locale, companionGender).id;
        const os = osUsable[locale];
        const osVoiceCount = os ? os.female + os.male : 0;
        const hostedOnly = isSingleVoiceLocale(locale) && osVoiceCount === 0
          && rows.length + maleRows.length === 1;
        const canAdd = voiceAddRemaining(locale) > 0;
        const renderButton = (button: TtsButtonVoice | RelayVoiceButton) => {
          const genderLabel = button.deliveryGender === 'male'
            ? t(lang, 'voiceFreeMale')
            : t(lang, 'voiceFreeFemale');
          const pitchLabel = t(lang, pitchTierLabelKey(button.pitchTier));
          const numLabel = `#${button.n} ${t(lang, button.labelKey)} · ${genderLabel} · ${pitchLabel}`;
          const selected = button.id === activeId;
          const live = playing === button.id;
          return (
            <button
              key={button.id}
              type="button"
              aria-label={numLabel}
              aria-pressed={selected}
              title={ttsButtonSpeaker(button)}
              data-voice-n={button.n}
              data-voice-id={button.id}
              data-voice-engine={button.engine}
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
        };
        return (
          <div key={locale} role="group" aria-labelledby={`amoji-voice-locale-${locale}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h4 id={`amoji-voice-locale-${locale}`} className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                {LANGUAGE_LABEL[locale]}
              </h4>
              <button
                type="button"
                data-testid={`voice-add-${locale}`}
                aria-label={t(lang, 'voiceAdd')}
                title={t(lang, 'voiceAddHint')}
                disabled={!canAdd}
                onClick={() => onAdd(locale)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                  canAdd
                    ? 'border-white/25 bg-white/10 text-white/85 hover:bg-white/15'
                    : 'cursor-not-allowed border-white/10 bg-transparent text-white/30'
                }`}
              >
                {t(lang, 'voiceAdd')}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
              {rows.map(renderButton)}
            </div>
            {maleRows.length > 0 && (
              <div className="space-y-1" data-testid={`voice-relay-male-${locale}`}>
                <h5 className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                  {t(lang, 'voiceRelayMales')}
                </h5>
                <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
                  {maleRows.map(renderButton)}
                </div>
              </div>
            )}
            {addNote[locale] && (
              <p className="text-[10px] leading-relaxed text-white/40" role="status" data-testid={`voice-add-note-${locale}`}>
                {addNote[locale]}
              </p>
            )}
            {hostedOnly && (
              <p
                className="text-[10px] leading-relaxed text-white/40"
                data-testid={`voice-single-note-${locale}`}
              >
                {t(lang, 'voiceOnlyOneAvailable')}
              </p>
            )}
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
      <TtsAppPicksPanel lang={lang} accent={accent} />
      <p className="text-[10px] leading-relaxed text-white/35" data-testid="voice-engines-note">
        {t(lang, 'voiceEnginesUnavailable')}
      </p>
      <TtsLabPanel lang={lang} accent={accent} />
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
