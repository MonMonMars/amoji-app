'use client';
// /terms — plain-language terms. Localized in all four languages.
import Link from 'next/link';
import { LEGAL_ACCEPT_VERSION } from '../../lib/legal-accept';
import { termsDoc } from '../../lib/legal-copy';
import { t, loadPrefs } from '../../lib/prefs';

export default function TermsPage() {
  const lang = loadPrefs().lang;
  const doc = termsDoc(lang);
  const backHome = lang === 'yue' ? '返回主頁' : lang === 'zh' ? '返回首页' : lang === 'ja' ? 'ホームに戻る' : 'Back to home';
  return (
    <main aria-labelledby="amoji-terms-title" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-neutral-950 px-5 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Amoji</p>
      <h1 id="amoji-terms-title" className="text-3xl font-bold">{doc.title}</h1>
      <p className="text-sm text-white/60">{t(lang, 'policyVersion')} {LEGAL_ACCEPT_VERSION}</p>
      <p className="text-sm leading-relaxed text-white/80">{doc.intro}</p>
      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        {doc.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-base font-semibold text-white">{s.heading}</h2>
            {s.body.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </section>
        ))}
      </div>
      <Link href="/safety" className="text-sm text-pink-200 underline-offset-4 hover:underline">{t(lang, 'safetyTitle')}</Link>
      <Link href="/credits" className="text-sm text-pink-200 underline-offset-4 hover:underline">{t(lang, 'creditsTitle')}</Link>
      <Link href="/" aria-label={backHome} className="mt-4 text-sm text-pink-200 underline-offset-4 hover:underline">{t(lang, 'back')}</Link>
    </main>
  );
}
