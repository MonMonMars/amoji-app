'use client';
/**
 * Shared first-run legal + safety copy for title, /setup, /gate, and EntryGate.
 * Setup scroll shows the full policy body; links below point at printable pages.
 */
import Link from 'next/link';
import type { LegalDoc } from '../lib/legal-copy';
import { privacyDoc, privacySummary, termsDoc, termsSummary } from '../lib/legal-copy';
import { LEGAL_ACCEPT_VERSION } from '../lib/legal-accept';
import { t, type Lang } from '../lib/prefs';

export function SetupLegalLinks({
  lang,
  className = 'text-pink-200/80 underline underline-offset-2',
}: {
  lang: Lang;
  className?: string;
}) {
  const privacy = privacySummary(lang);
  const terms = termsSummary(lang);
  return (
    <p className="text-xs leading-relaxed">
      <Link href="/privacy" aria-label={privacy.title} className={className}>
        /privacy
      </Link>
      {' · '}
      <Link href="/terms" aria-label={terms.title} className={className}>
        /terms
      </Link>
      {' · '}
      <Link href="/safety" aria-label={t(lang, 'safetyTitle')} className={className}>
        /safety
      </Link>
    </p>
  );
}

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
        <p className="mt-2 font-medium text-white/75">{t(lang, 'safetyCrisisLine')}</p>
        <p className="mt-2 text-white/70">{t(lang, 'safetyLead')}</p>
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
      <p className="text-xs text-white/45">{t(lang, 'setupFullDocHint')}</p>
      <SetupLegalLinks lang={lang} />
    </>
  );
}
