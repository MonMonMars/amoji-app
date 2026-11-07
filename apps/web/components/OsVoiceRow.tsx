'use client';
// OS voices for the current language, when the device really has enough of them
// to be a choice.
//
// This is the OTHER live source beside Google Translate's one-voice-per-language
// MP3 tier. Windows and macOS install several genuinely different voices per
// language (Windows 11 ships Danny + Tracy for zh-HK, Ayumi/Haruka/Sayaka +
// Ichiro for ja-JP), and they cost nothing and need no network.
//
// Two honesty rules:
//   1. Never render a gender the name did not support — 'unknown' is a label,
//      not a gap to fill.
//   2. Never render a voice the platform will silently replace. iOS lists many
//      voices and plays one per language; those rows are excluded from the
//      choosable list and explained in the diagnostics instead.

import { useEffect, useMemo, useState } from 'react';
import {
  buildInventory,
  loadVoices,
  onVoicesChanged,
  platformFromUA,
  type InferredGender,
  type OsVoice,
  type RawVoice,
} from '../lib/browser-voices';
import { osVoicesAreChoosable } from '../lib/voice-capability';
import { t, type Lang } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';

const GENDER_ORDER: readonly InferredGender[] = ['female', 'male', 'unknown'];

export default function OsVoiceRow({
  locale,
  lang,
  accent,
  disabled,
  onPreview,
  onInventory,
}: {
  locale: VoiceLocale;
  lang: Lang;
  accent: string;
  disabled?: boolean;
  /** Speak this exact OS voice. Wired to the existing synth path by the caller. */
  onPreview?: (voice: OsVoice) => void;
  /**
   * Reports what this device contributes, so the parent can avoid saying "this
   * language has one voice" while a row of four device voices is right below it.
   */
  onInventory?: (usable: { female: number; male: number }, total: number) => void;
}) {
  const [voices, setVoices] = useState<readonly RawVoice[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadVoices().then((list) => { if (alive) setVoices(list); });
    const off = onVoicesChanged((list) => { if (alive) setVoices(list); });
    return () => { alive = false; off(); };
  }, []);

  const inventory = useMemo(() => {
    if (!voices || !voices.length) return null;
    const platform = platformFromUA(
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
      typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
    );
    return buildInventory(voices, locale, platform);
  }, [voices, locale]);

  const nativeUsable = inventory?.native.filter((v) => v.usable).length ?? 0;
  useEffect(() => {
    if (!inventory) { onInventory?.({ female: 0, male: 0 }, 0); return; }
    onInventory?.({ female: inventory.usable.female, male: inventory.usable.male }, nativeUsable);
  }, [inventory, nativeUsable, onInventory]);

  if (!inventory || !inventory.supported) return null;
  const choosable = inventory.voices.filter((v) => v.fit === 'native' && v.usable);
  if (!choosable.length) return null;

  // Whether this device clears the 3-per-gender bar. It does not change what is
  // rendered — every real voice gets a button — it changes whether the summary
  // reads as a plain count or as a shortfall.
  const meetsBar = osVoicesAreChoosable(inventory.usable);

  return (
    <div className="space-y-1" data-testid={`os-voice-row-${locale}`} data-os-usable={`${inventory.usable.female}/${inventory.usable.male}`}>
      <h5 className="text-[10px] uppercase tracking-[0.12em] text-white/40">
        {t(lang, 'osVoicesTitle')}
      </h5>
      {GENDER_ORDER.map((gender) => {
        const group = choosable.filter((v) => v.gender === gender);
        if (!group.length) return null;
        const heading = gender === 'female'
          ? t(lang, 'genderFemale')
          : gender === 'male' ? t(lang, 'genderMale') : t(lang, 'osVoicesGenderUnknown');
        return (
          <div key={gender} role="group" aria-label={heading} className="space-y-0.5">
            <p className="text-[9px] uppercase tracking-[0.12em] text-white/30">{heading}</p>
            <div className="grid grid-cols-1 gap-1 min-[380px]:grid-cols-2">
              {group.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  disabled={disabled}
                  aria-label={`${voice.name} · ${voice.lang}`}
                  title={`${voice.name} · ${voice.lang}${voice.localService ? '' : ` · ${t(lang, 'osVoicesNetwork')}`}`}
                  data-voice-id={voice.id}
                  data-voice-gender={voice.gender}
                  data-gender-source={voice.genderSource}
                  data-voice-os="1"
                  onClick={() => onPreview?.(voice)}
                  className="ui-btn min-h-9 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-left text-[10px] leading-tight text-white/80 hover:bg-white/10 disabled:opacity-50"
                  style={{ borderColor: `${accent}44` }}
                >
                  <span className="block truncate">{voice.name}</span>
                  <span className="block text-[9px] text-white/40">
                    {voice.localService ? voice.lang : `${voice.lang} · ${t(lang, 'osVoicesNetwork')}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {/* Always state the real count. A language with one OS voice is not a
          choice, so it says "1 female, 1 male" instead of looking like a menu
          that is missing entries. */}
      <p className="text-[10px] leading-relaxed text-white/40" data-testid={`os-voice-summary-${locale}`} data-meets-three={meetsBar ? '1' : '0'}>
        {t(lang, 'osVoicesCount', {
          n: String(inventory.native.length),
          female: String(inventory.usable.female),
          male: String(inventory.usable.male),
        })}
      </p>
    </div>
  );
}
