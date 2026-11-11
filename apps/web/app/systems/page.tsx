'use client';
import Link from 'next/link';
import { CLIENT_STORAGE_KEYS, CLIENT_STORAGE_PREFIXES, storageClientStatus } from '../../lib/client-storage';
import { FILE_LOCATIONS, FREE_SERVERS, productionApiConfigured, systemsSnapshot } from '../../lib/systems-catalog';
import { securityFacts } from '../../lib/security-policy';
import { planStatusSummary, paymentsConfigured, billingSnapshot } from '../../lib/billing';
import { CHARGING_RULES, formatPlanPrice } from '../../lib/charging-rules';
import { paymentDemoMode } from '../../lib/payment-rules';
import { RATE_LIMIT_RULES, ROUTE_AUTH_RULES, SECURITY_ENV, securityClientStatus } from '../../lib/security-rules';
import { LEGAL_DOC_ROUTES, legalClientStatus } from '../../lib/legal-rules';
import { loadPrefs, t } from '../../lib/prefs';

export default function SystemsPage() {
  const lang = loadPrefs().lang;
  const snap = systemsSnapshot();
  const billing = billingSnapshot();
  const security = securityClientStatus();
  const storage = storageClientStatus(productionApiConfigured());
  const legal = legalClientStatus();
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
          {paymentsConfigured()
            ? t(lang, 'planPaymentsOn')
            : paymentDemoMode()
              ? t(lang, 'planPaymentsDemo')
              : t(lang, 'planPaymentsOff')}
        </p>
        <p className="text-xs text-white/45">
          API: {snap.productionApi ? 'configured' : 'unset (Pages / on-device)'}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsCharging')}</h2>
        <p className="text-sm text-white/80">{CHARGING_RULES.plans.free.summary}</p>
        <p className="text-sm text-white/80">
          {CHARGING_RULES.plans.plus.summary} Catalog {formatPlanPrice()}.
        </p>
        <ul className="space-y-2">
          {CHARGING_RULES.features.map((f) => (
            <li key={f.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm font-medium text-white/90">
                {f.label}
                <span className="ml-2 font-normal text-white/45">
                  {f.gatedByDailyQuota ? `${f.costTurns} turn` : 'free'}
                </span>
              </p>
              {f.notes && <p className="mt-1 text-xs text-white/55">{f.notes}</p>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/45">
          Rules v{billing.charging.version} · unit {billing.charging.unit} · reset {billing.charging.reset}
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
        <p className="text-xs text-white/55">{storage.posture}</p>
        <p className="text-xs text-white/45">
          Present: {storage.presentLocal} local · {storage.presentSession} session · ~{Math.max(1, Math.round(storage.estimatedBytes / 1024))} KB
        </p>
        <ul className="space-y-1.5">
          {CLIENT_STORAGE_KEYS.map((k) => (
            <li key={k.key} className="font-mono text-[11px] text-white/70">
              {k.key} <span className="font-sans text-white/40">— {k.purpose}{k.sensitive ? ' (sensitive)' : ''}</span>
            </li>
          ))}
          {CLIENT_STORAGE_PREFIXES.map((p) => (
            <li key={p.prefix} className="font-mono text-[11px] text-white/70">
              {p.prefix}* <span className="font-sans text-white/40">— {p.purpose}{p.sensitive ? ' (sensitive)' : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'systemsSecurity')}</h2>
        <p className="text-xs text-white/55">{security.posture}</p>
        <ul className="space-y-3">
          {securityFacts().map((f) => (
            <li key={f.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm font-medium text-white/90">{f.title}</p>
              <p className="mt-1 text-xs text-white/55">{f.detail}</p>
            </li>
          ))}
        </ul>
        <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-white/40">Rate limits (Node API)</h3>
        <ul className="space-y-1.5">
          {RATE_LIMIT_RULES.map((r) => (
            <li key={r.id} className="text-xs text-white/70">
              <span className="font-mono text-white/90">{r.bucket}</span>
              {' '}{r.limit}/{r.windowMs / 1000}s — {r.notes}
            </li>
          ))}
        </ul>
        <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-white/40">Route auth</h3>
        <ul className="space-y-1.5">
          {ROUTE_AUTH_RULES.map((r) => (
            <li key={`${r.method}:${r.path}`} className="text-xs text-white/70">
              <span className="font-mono text-white/90">{r.method} {r.path}</span>
              {' '}· {r.auth} — {r.notes}
            </li>
          ))}
        </ul>
        <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-white/40">Env (documented; values never shown)</h3>
        <ul className="space-y-1.5">
          {SECURITY_ENV.map((e) => (
            <li key={e.name} className="text-xs text-white/70">
              <span className="font-mono text-white/90">{e.name}</span>
              {' '}({e.where}{e.required ? ', required' : ', optional'}) — {e.purpose}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">{t(lang, 'settingsLegal')}</h2>
        <p className="text-xs text-white/55">{legal.posture}</p>
        <ul className="space-y-2">
          {LEGAL_DOC_ROUTES.map((d) => (
            <li key={d.id}>
              <Link href={d.path} className="text-sm text-white/85 underline-offset-4 hover:underline">
                {d.path}
              </Link>
              <span className="text-xs text-white/45"> — {d.summary}{d.gated ? ' (gated)' : ''}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
