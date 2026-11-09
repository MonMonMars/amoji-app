'use client';
/**
 * Shared first-run legal + safety copy for title and the unified /setup scroll.
 * All policy bodies live in SetupOneScrollBody — no separate legal mini-flow.
 *
 * 「即刻搵人傾」 helpline numbers appear only on the view-only /rules reader
 * (and crisis popup). The first-run Agree / START page keeps a short crisis
 * notice and points people at /rules — it does not list numbers.
 */
import { useMemo } from 'react';
import type { LegalDoc } from '../lib/legal-copy';
import { privacyDoc, termsDoc } from '../lib/legal-copy';
import { LEGAL_ACCEPT_VERSION } from '../lib/legal-accept';
import { currentHelplineRegion } from '../lib/crisis-location';
import { t, type Lang } from '../lib/prefs';
import { HelplineList } from './HelplineList';

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

/** Full in-page disclosures — consent mode requires scroll before START unlocks. */
export function SetupOneScrollBody({
  lang,
  showConsentDisclaimer = true,
  showHelplines = false,
}: {
  lang: Lang;
  /** Hide "By tapping START…" on view-only /rules. */
  showConsentDisclaimer?: boolean;
  /**
   * View-only /rules (and crisis deep-links): show 「即刻搵人傾」 with
   * location-aware numbers. First-run Agree / START must keep this false.
   */
  showHelplines?: boolean;
}) {
  const privacy = privacyDoc(lang);
  const terms = termsDoc(lang);
  const helplineRegion = useMemo(
    () => (showHelplines ? currentHelplineRegion(lang) : null),
    [lang, showHelplines],
  );
  return (
    <>
      <section aria-labelledby="setup-age-heading">
        <h2 id="setup-age-heading" className="text-base font-semibold text-white">
          {t(lang, 'gate18Title')}
        </h2>
        <p className="mt-2 text-white/70">{t(lang, 'gate18Body')}</p>
      </section>

      {showConsentDisclaimer && (
        <p className="text-white/65">{t(lang, 'setupOneLead')}</p>
      )}

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

      <section aria-labelledby="setup-mic-heading" data-testid="setup-mic-section">
        <h2 id="setup-mic-heading" className="text-base font-semibold text-white">
          {t(lang, 'gateMicTitle')}
        </h2>
        <p className="mt-2 text-white/70">{t(lang, 'gateMicBody')}</p>
      </section>

      <section aria-labelledby="setup-safety-heading">
        <h2 id="setup-safety-heading" className="text-base font-semibold text-white">
          {t(lang, 'safetyTitle')}
        </h2>
        <p className="mt-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 font-medium text-rose-50/95">
          {t(lang, showHelplines ? 'safetyLead' : 'safetyLeadAgree')}
        </p>
        {showHelplines ? (
          <>
            <p className="mt-2 text-white/70">{t(lang, 'safetyCrisisLine')}</p>
            <h3 id="setup-safety-helplines" className="mt-4 text-sm font-semibold text-white">
              {t(lang, 'safetyHelplinesTitle')}
            </h3>
            <HelplineList region={helplineRegion} testId="rules-helpline-list" />
          </>
        ) : (
          <p
            data-testid="setup-helplines-rules-hint"
            className="mt-2 text-white/65"
          >
            {t(lang, 'safetyHelplinesRulesHint')}
          </p>
        )}
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

      {showConsentDisclaimer && (
        <p className="text-xs text-white/50">{t(lang, 'setupOneDisclaimer')}</p>
      )}
      <p className="text-xs text-white/40">
        {t(lang, 'policyVersion')} {LEGAL_ACCEPT_VERSION}
      </p>
    </>
  );
}
