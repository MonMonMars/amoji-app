'use client';
import Link from 'next/link';
import { cookiesDoc } from '../../lib/legal-copy';
import { loadPrefs, t } from '../../lib/prefs';

export default function CookiesPage() {
  const lang = loadPrefs().lang;
  const doc = cookiesDoc(lang);
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-white">
      <p className="mb-6 text-sm text-white/50">
        <Link href="/" aria-label={t(lang, 'back')} className="underline-offset-4 hover:underline">{t(lang, 'back')}</Link>
        {' · '}
        <Link href="/privacy" className="underline-offset-4 hover:underline">{t(lang, 'privacyTitle')}</Link>
        {' · '}
        <Link href="/systems" className="underline-offset-4 hover:underline">{t(lang, 'systemsTitle')}</Link>
      </p>
      <h1 className="text-2xl font-semibold">{doc.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{doc.intro}</p>
      <div className="mt-8 space-y-6">
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{section.heading}</h2>
            {section.body.map((line) => (
              <p key={line.slice(0, 48)} className="text-sm leading-relaxed text-white/80">{line}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
