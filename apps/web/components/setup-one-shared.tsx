'use client';
/**
 * Shared first-run legal + safety links for title, /setup, /gate, and EntryGate.
 */
import Link from 'next/link';
import { privacySummary, termsSummary } from '../lib/legal-copy';
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
