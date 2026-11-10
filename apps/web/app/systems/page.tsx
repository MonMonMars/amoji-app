'use client';
import Link from 'next/link';
import { CLIENT_STORAGE_KEYS } from '../../lib/client-storage';
import { FILE_LOCATIONS, FREE_SERVERS, systemsSnapshot } from '../../lib/systems-catalog';
import { securityFacts } from '../../lib/security-policy';
import { planStatusSummary, paymentsConfigured } from '../../lib/billing';
import { loadPrefs, t } from '../../lib/prefs';

export default function SystemsPage() {
  const lang = loadPrefs().lang;
  const snap = systemsSnapshot();
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-white">
      <p className="mb-6 text-sm text-white/50">
        <Link href="/" aria-label={t(lang, 'back')} className="underline-offset-4 hover:underline">{t(lang, 'back')}</Link>
        {' · '}
        <Link href="/privacy" className="underline-offset-4 hover:underline">{t(lang, 'privacyTitle')}</Link>
        {' · '}
        <Link href="/cookies" className="underline-offset-4 hover:underline">{t(lang, 'cookiesTitle')}</Link>
      </p>
      <h1 className="text-2xl font-semibold">{t(lang, 'systemsTitle')}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{t(lang, 'systemsLead')}</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'settingsPlan')}</h2>
        <p className="text-sm text-white/80">{planStatusSummary()}</p>
        <p className="text-xs text-white/45">
          {paymentsConfigured() ? t(lang, 'planPaymentsOn') : t(lang, 'planPaymentsOff')}
        </p>
        <p className="text-xs text-white/45">
          API: {snap.productionApi ? 'configured' : 'unset (Pages / on-device)'}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsFreeHosts')}</h2>
        <ul className="space-y-3">
          {FREE_SERVERS.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm font-medium text-white/90">{s.role}</p>
              <p className="text-xs text-pink-100/80">{s.host}</p>
              <p className="mt-1 text-xs text-white/55">{s.notes}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsFiles')}</h2>
        <ul className="space-y-2">
          {FILE_LOCATIONS.map((f) => (
            <li key={f.id} className="text-sm text-white/80">
              <span className="text-white/45">{f.kind}: </span>{f.location}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsClientData')}</h2>
        <ul className="space-y-1.5">
          {CLIENT_STORAGE_KEYS.map((k) => (
            <li key={k.key} className="font-mono text-[11px] text-white/70">
              {k.key} <span className="font-sans text-white/40">— {k.purpose}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsSecurity')}</h2>
        <ul className="space-y-3">
          {securityFacts().map((f) => (
            <li key={f.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm font-medium text-white/90">{f.title}</p>
              <p className="mt-1 text-xs text-white/55">{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
