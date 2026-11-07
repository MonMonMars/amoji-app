'use client';
// /safety — the page the crisis reply links to. Plain statements, real
// numbers. Helpline names and numbers are intentionally NOT translated: a
// translated number is a wrong number, and a person in crisis needs to dial.
import Link from 'next/link';
import { CRISIS_HELPLINES } from '../../lib/crisis';
import { LEGAL_ACCEPT_VERSION } from '../../lib/legal-accept';
import { t, loadPrefs } from '../../lib/prefs';

/** Emergency numbers by the places Amoji is most used from. */
const EMERGENCY = 'Hong Kong 999 · United States / Canada 911 · Japan 110 (police) · 119 (ambulance)';

export default function SafetyPage() {
  const lang = loadPrefs().lang;
  const backHome = lang === 'yue' ? '返回主頁' : lang === 'zh' ? '返回首页' : lang === 'ja' ? 'ホームに戻る' : 'Back to home';

  return (
    <main aria-labelledby="amoji-safety-title" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 bg-neutral-950 px-5 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Amoji</p>
      <h1 id="amoji-safety-title" className="text-3xl font-bold">{t(lang, 'safetyTitle')}</h1>

      <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-rose-50">
        {t(lang, 'safetyLead')}
      </p>

      <section aria-labelledby="amoji-safety-lines" className="space-y-2">
        <h2 id="amoji-safety-lines" className="text-lg font-semibold">{t(lang, 'safetyHelplinesTitle')}</h2>
        <ul className="space-y-2 text-sm">
          {CRISIS_HELPLINES.map((h) => (
            <li key={`${h.name}-${h.tel}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <a
                href={`tel:${h.tel.replace(/[^0-9+]/g, '')}`}
                aria-label={`${h.name} ${h.tel}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-pink-200 underline-offset-4 hover:underline"
              >
                <span className="font-medium">{h.name}</span>
                <span className="tabular-nums text-base font-semibold text-white">{h.tel}</span>
              </a>
              <p className="mt-1 text-xs text-white/45">{h.where}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="amoji-safety-emergency" className="space-y-1">
        <h2 id="amoji-safety-emergency" className="text-lg font-semibold">{t(lang, 'safetyEmergencyTitle')}</h2>
        <p className="text-sm leading-relaxed text-white/80">{EMERGENCY}</p>
      </section>

      <section aria-labelledby="amoji-safety-do" className="space-y-2">
        <h2 id="amoji-safety-do" className="text-lg font-semibold">{t(lang, 'safetyStepsTitle')}</h2>
        <p className="text-sm leading-relaxed text-white/80">{t(lang, 'safetyStepsBody')}</p>
      </section>

      <p className="text-xs leading-relaxed text-white/40">{t(lang, 'safetyAboutAi')}</p>
      <p className="text-xs text-white/30">{t(lang, 'policyVersion')} {LEGAL_ACCEPT_VERSION}</p>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Link href="/" aria-label={backHome} className="text-sm text-pink-200 underline-offset-4 hover:underline">{t(lang, 'back')}</Link>
        <Link href="/privacy" className="text-sm text-pink-200 underline-offset-4 hover:underline">{t(lang, 'safetyPrivacyLink')}</Link>
      </div>
    </main>
  );
}
