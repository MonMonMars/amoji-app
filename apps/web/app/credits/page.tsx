'use client';
// /credits — attribution for every shipped model whose licence requires it.
// The credit strings come from each VRM's own embedded metadata; see
// lib/credits.ts for where each one was read from.
import Link from 'next/link';
import { FALLBACK_CREDIT, REQUIRED_CREDITS, creditsDoc } from '../../lib/credits';
import { loadPrefs, t } from '../../lib/prefs';
import type { CreditEntry } from '../../lib/credits';

function CreditRow({ entry, doc }: { entry: CreditEntry; doc: ReturnType<typeof creditsDoc> }) {
  return (
    <li className="space-y-1 border-l-2 border-white/15 pl-3">
      <p className="text-sm font-semibold text-white">{entry.work}</p>
      <dl className="space-y-0.5 text-xs text-white/70">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-white/45">{doc.byLabel}</dt>
          <dd className="text-white/85">{entry.by}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-white/45">{doc.licenseLabel}</dt>
          <dd>
            <a
              href={entry.licenseUrl}
              rel="noreferrer noopener"
              target="_blank"
              className="text-pink-200 underline-offset-4 hover:underline"
            >
              {entry.license}
            </a>
          </dd>
        </div>
        {entry.sourceUrl ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-white/45">{doc.sourceLabel}</dt>
            <dd>
              <a
                href={entry.sourceUrl}
                rel="noreferrer noopener"
                target="_blank"
                className="break-all text-pink-200 underline-offset-4 hover:underline"
              >
                {entry.sourceUrl}
              </a>
            </dd>
          </div>
        ) : null}
        {entry.extra ? (
          <dd className="space-y-0.5 pt-1 text-white/85">
            {entry.extra.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </dd>
        ) : null}
      </dl>
    </li>
  );
}

export default function CreditsPage() {
  const lang = loadPrefs().lang;
  const doc = creditsDoc(lang);
  return (
    <main aria-labelledby="amoji-credits-title" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-neutral-950 px-5 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Amoji</p>
      <h1 id="amoji-credits-title" className="text-3xl font-bold">{doc.title}</h1>
      <p className="text-sm leading-relaxed text-white/80">{doc.intro}</p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">{doc.modelsHeading}</h2>
        <ul className="space-y-3">
          {REQUIRED_CREDITS.map((entry) => <CreditRow key={entry.id} entry={entry} doc={doc} />)}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">{doc.fallbackHeading}</h2>
        <ul className="space-y-3">
          <CreditRow entry={FALLBACK_CREDIT} doc={doc} />
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-white">{doc.cc0Heading}</h2>
        <p className="text-sm leading-relaxed text-white/70">{doc.cc0Body}</p>
      </section>

      <nav className="flex flex-col gap-2 text-sm">
        <Link href="/setup#setup-privacy-heading" aria-label={t(lang, 'privacyTitle')} className="text-pink-200 underline-offset-4 hover:underline">
          {t(lang, 'privacyTitle')}
        </Link>
        <Link href="/setup#setup-terms-heading" aria-label={t(lang, 'termsTitle')} className="text-pink-200 underline-offset-4 hover:underline">
          {t(lang, 'termsTitle')}
        </Link>
        <Link href="/" aria-label={doc.back} className="mt-2 text-pink-200 underline-offset-4 hover:underline">{doc.back}</Link>
      </nav>
    </main>
  );
}
