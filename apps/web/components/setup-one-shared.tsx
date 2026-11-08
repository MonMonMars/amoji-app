'use client';
/**
 * Shared first-run legal + safety copy for title and the unified /setup scroll.
 * All policy bodies live in SetupOneScrollBody — no separate legal mini-flow.
 */
import type { LegalDoc } from '../lib/legal-copy';
import { privacyDoc, termsDoc } from '../lib/legal-copy';
import { CRISIS_HELPLINES } from '../lib/crisis';
import { LEGAL_ACCEPT_VERSION } from '../lib/legal-accept';
import { t, type Lang } from '../lib/prefs';

/** Emergency numbers by the places Amoji is most used from. */
const EMERGENCY =
  'Hong Kong 999 · United States / Canada 911 · Japan 110 (police) · 119 (ambulance)';

export function SetupOneAiNotice({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <p className={className ?? 'text-xs leading-relaxed text-white/55'}>
      {t(lang, 'aiNotice')}
    </p>
  );
}

function LegalDocInline({ doc, idPrefix }: { doc: LegalDoc; idPrefix: string }) {
  return (
    <>
      <p className="text-white/70">{doc.intro}</p>
      <div className="mt-3 space-y-4">
        {doc.sections.map((section, sectionIndex) => {
          const headingId = `${idPrefix}-section-${sectionIndex}`;
          return (
            <section key={headingId} aria-labelledby={headingId} className="space-y-2">
              <h3 id={headingId} className="text-sm font-semibold text-white">
                {section.heading}
              </h3>
              {section.body.map((line, lineIndex) => (
                <p
                  key={lineIndex}
                  className={line.startsWith('·') ? 'pl-3 text-white/65' : 'text-white/70'}
                >
                  {line}
                </p>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Full in-page disclosures — user must scroll this region before START unlocks. */
export function SetupOneScrollBody({ lang }: { lang: Lang }) {
  const privacy = privacyDoc(lang);
  const terms = termsDoc(lang);
  return (
    <>
      <section aria-labelledby="setup-age-heading">
        <h2 id="setup-age-heading" className="text-base font-semibold text-white">
          {t(lang, 'gate18Title')}
        </h2>
        <p className="mt-2 text-white/70">{t(lang, 'gate18Body')}</p>
      </section>

      <p className="text-white/65">{t(lang, 'setupOneLead')}</p>

      <section aria-labelledby="setup-ai-heading">
        <h2 id="setup-ai-heading" className="text-base font-semibold text-white">
          {t(lang, 'setupDisclosureAiTitle')}
        </h2>
        <SetupOneAiNotice lang={lang} className="mt-2 text-sm leading-relaxed text-white/70" />
      </section>

      <section aria-labelledby="setup-audio-heading">
        <h2 id="setup-audio-heading" className="text-base font-semibold text-white">
          {t(lang, 'gateAudioTitle')}
        </h2>
        <p className="mt-2 text-white/70">{t(lang, 'gateAudioBody')}</p>
        <p className="mt-2 text-white/60">{t(lang, 'gateAudioIosHint')}</p>
        <p className="mt-2 text-xs text-white/55">{t(lang, 'gateHelpNote')}</p>
      </section>

      <section aria-labelledby="setup-mic-heading">
        <h2 id="setup-mic-heading" className="text-base font-semibold text-white">
          {t(lang, 'gateMicTitle')}
        </h2>
        <p className="mt-2 text-white/70">{t(lang, 'gateMicBody')}</p>
        <p className="mt-2 text-xs text-white/55">{t(lang, 'gateMicUnsupported')}</p>
      </section>

      <section aria-labelledby="setup-safety-heading">
        <h2 id="setup-safety-heading" className="text-base font-semibold text-white">
          {t(lang, 'safetyTitle')}
        </h2>
        <p className="mt-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 font-medium text-rose-50/95">
          {t(lang, 'safetyLead')}
        </p>
        <p className="mt-2 text-white/70">{t(lang, 'safetyCrisisLine')}</p>
        <h3 id="setup-safety-helplines" className="mt-4 text-sm font-semibold text-white">
          {t(lang, 'safetyHelplinesTitle')}
        </h3>
        <ul className="mt-2 space-y-2">
          {CRISIS_HELPLINES.map((h) => (
            <li
              key={`${h.name}-${h.tel}`}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
            >
              <a
                href={`tel:${h.tel.replace(/[^0-9+]/g, '')}`}
                aria-label={`${h.name} ${h.tel}`}
                className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-pink-200 underline-offset-4 hover:underline"
              >
                <span className="font-medium">{h.name}</span>
                <span className="tabular-nums text-sm font-semibold text-white">{h.tel}</span>
              </a>
              <p className="mt-0.5 text-white/45">{h.where}</p>
            </li>
          ))}
        </ul>
        <h3 id="setup-safety-emergency" className="mt-4 text-sm font-semibold text-white">
          {t(lang, 'safetyEmergencyTitle')}
        </h3>
        <p className="mt-1 text-white/70">{EMERGENCY}</p>
        <h3 id="setup-safety-steps" className="mt-4 text-sm font-semibold text-white">
          {t(lang, 'safetyStepsTitle')}
        </h3>
        <p className="mt-1 text-white/70">{t(lang, 'safetyStepsBody')}</p>
        <p className="mt-3 text-xs text-white/50">{t(lang, 'safetyAboutAi')}</p>
      </section>

      <section aria-labelledby="setup-privacy-heading">
        <h2 id="setup-privacy-heading" className="text-base font-semibold text-white">
          {privacy.title}
        </h2>
        <LegalDocInline doc={privacy} idPrefix="setup-privacy" />
      </section>

      <section aria-labelledby="setup-terms-heading">
        <h2 id="setup-terms-heading" className="text-base font-semibold text-white">
          {terms.title}
        </h2>
        <LegalDocInline doc={terms} idPrefix="setup-terms" />
      </section>

      <p className="text-xs text-white/50">{t(lang, 'setupOneDisclaimer')}</p>
      <p className="text-xs text-white/40">
        {t(lang, 'policyVersion')} {LEGAL_ACCEPT_VERSION}
      </p>
    </>
  );
}
