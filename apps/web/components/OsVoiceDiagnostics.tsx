'use client';
// Settings → Voice → "Which voices this device really has".
//
// This is the surface that answers "why do I only hear one voice?" with the
// device's own answer instead of a guess. It prints the raw speechSynthesis
// list: every voice, its locale, whether it is local or needs the network, and
// the gender the name heuristic inferred (plus which rule did it).
//
// It deliberately shows voices that will NOT play (iOS lists many and speaks
// one per language) and voices that would mispronounce the language (a Mandarin
// voice offered for Cantonese). Hiding them is what made the old picker claim
// 58 distinct voices when there was one.

import { useEffect, useMemo, useState } from 'react';
import {
  buildAllInventories,
  loadVoices,
  onVoicesChanged,
  platformFromUA,
  summarizeInventory,
  type DevicePlatform,
  type OsVoice,
  type OsVoiceCaveat,
  type OsVoiceInventory,
  type RawVoice,
} from '../lib/browser-voices';
import { t, type Lang, type StrKey } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';

const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];
const LANGUAGE_LABEL: Record<VoiceLocale, string> = {
  yue: '廣東話',
  zh: '中文',
  ja: '日本語',
  en: 'English',
};

const CAVEAT_KEY: Record<OsVoiceCaveat, StrKey> = {
  'ios-silent-switch': 'osVoicesCaveatIosSilent',
  'ios-one-per-language': 'osVoicesCaveatIosOnePerLang',
  'android-system-voice': 'osVoicesCaveatAndroidSystem',
  'macos-voices-need-download': 'osVoicesCaveatMacDownload',
};

function genderLabel(lang: Lang, voice: OsVoice): string {
  if (voice.gender === 'female') return t(lang, 'genderFemale');
  if (voice.gender === 'male') return t(lang, 'genderMale');
  return t(lang, 'osVoicesGenderUnknown');
}

/** One readable line per voice, so a screenshot of this is self-explanatory. */
function voiceLine(lang: Lang, voice: OsVoice): string {
  const bits = [voice.name, voice.lang, genderLabel(lang, voice)];
  if (!voice.localService) bits.push(t(lang, 'osVoicesNetwork'));
  if (voice.fit === 'substitute') bits.push(t(lang, 'osVoicesSubstitute'));
  if (!voice.usable) bits.push(t(lang, 'osVoicesUnreachable'));
  return bits.join(' · ');
}

export default function OsVoiceDiagnostics({ lang, accent }: { lang: Lang; accent: string }) {
  const [voices, setVoices] = useState<readonly RawVoice[] | null>(null);
  // Read at mount rather than in an effect: the UA never changes mid-session,
  // and setting it from an effect body is a cascading render for no reason.
  const [platform] = useState<DevicePlatform>(() => platformFromUA(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
    typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
  ));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadVoices().then((list) => {
      if (!alive) return;
      setVoices(list);
    });
    // A voice installed while the sheet is open should appear without a reload.
    const off = onVoicesChanged((list) => { if (alive) setVoices(list); });
    return () => { alive = false; off(); };
  }, []);

  const onProbe = () => {
    setBusy(true);
    void loadVoices({ timeoutMs: 1500 }).then((list) => {
      setVoices(list);
      setBusy(false);
    });
  };

  const inventories = useMemo(() => {
    if (!voices || !voices.length) return null;
    return buildAllInventories(voices, platform);
  }, [voices, platform]);

  const shownCaveats = useMemo(() => {
    if (!inventories) return [] as OsVoiceCaveat[];
    const seen = new Set<OsVoiceCaveat>();
    for (const locale of LOCALES) for (const c of inventories[locale].caveats) seen.add(c);
    return [...seen];
  }, [inventories]);

  const total = voices?.length ?? 0;

  return (
    <div className="space-y-2" data-testid="os-voice-diagnostics">
      <div>
        <p className="text-sm text-white/85">{t(lang, 'osVoicesDiagTitle')}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t(lang, 'osVoicesDiagHint')}</p>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">
        <span className="text-[11px] text-white/70" data-testid="os-voice-total">
          {t(lang, 'osVoicesTitle')} · {total}
        </span>
        <button
          type="button"
          onClick={onProbe}
          disabled={busy}
          className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white/75 disabled:opacity-50"
        >
          {busy ? '…' : t(lang, 'osVoicesProbe')}
        </button>
      </div>

      {voices !== null && total === 0 && (
        <p className="text-[11px] leading-relaxed text-white/45" data-testid="os-voice-empty">
          {t(lang, 'osVoicesDiagEmpty')}
        </p>
      )}

      {shownCaveats.map((caveat) => (
        <p
          key={caveat}
          className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-100/85"
          data-testid={`os-voice-caveat-${caveat}`}
        >
          {t(lang, CAVEAT_KEY[caveat])}
        </p>
      ))}

      {inventories && LOCALES.map((locale) => {
        const inv: OsVoiceInventory = inventories[locale];
        const sum = summarizeInventory(inv);
        return (
          <section
            key={locale}
            role="group"
            aria-labelledby={`os-voice-locale-${locale}`}
            className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5"
            data-testid={`os-voice-locale-${locale}`}
          >
            <h5 id={`os-voice-locale-${locale}`} className="flex items-baseline justify-between gap-2 text-[11px] font-medium text-white/80">
              <span>{LANGUAGE_LABEL[locale]}</span>
              <span className="text-[10px] font-normal text-white/50" data-testid={`os-voice-count-${locale}`}>
                {inv.voices.length === 0
                  ? t(lang, 'osVoicesNone')
                  : t(lang, 'osVoicesCount', {
                    n: String(inv.native.length),
                    female: String(sum.female),
                    male: String(sum.male),
                  })}
              </span>
            </h5>
            {inv.voices.length > 0 && (
              <ul className="mt-1 space-y-0.5" data-testid={`os-voice-list-${locale}`}>
                {inv.voices.map((voice) => (
                  <li
                    key={voice.id}
                    className={`text-[10px] leading-relaxed ${voice.fit === 'native' && voice.usable ? 'text-white/70' : 'text-white/40'}`}
                    data-voice-gender={voice.gender}
                    data-gender-source={voice.genderSource}
                    data-voice-usable={voice.usable ? '1' : '0'}
                    data-voice-fit={voice.fit}
                  >
                    <span
                      aria-hidden="true"
                      className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                      style={{ backgroundColor: voice.usable ? accent : 'transparent', border: voice.usable ? 'none' : '1px solid rgba(255,255,255,0.35)' }}
                    />
                    {voiceLine(lang, voice)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-[10px] leading-relaxed text-white/35" data-testid="os-voice-inferred-note">
        {t(lang, 'osVoicesInferred')}
      </p>
    </div>
  );
}
