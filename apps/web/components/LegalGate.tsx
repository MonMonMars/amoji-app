'use client';
/**
 * First-run legal click-to-accept gate.
 * Blocks the app until Privacy + Terms are accepted for LEGAL_ACCEPT_VERSION.
 * Copy is plain and specific — see lib/legal-copy.ts for the recipients named.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LEGAL_ACCEPT_VERSION,
  acceptCurrentLegal,
  hasAcceptedCurrentLegal,
  subscribeLegalAccept,
} from '../lib/legal-accept';
import { privacySummary, termsSummary } from '../lib/legal-copy';
import { usePrefs, t, type Lang } from '../lib/prefs';
import { useFocusTrap } from '../lib/use-focus-trap';

// /safety belongs here too: the gate itself points at it, so it must be
// readable without first accepting the terms.
const LEGAL_DOC_PATHS = new Set(['/privacy', '/terms', '/safety']);

const COPY: Record<'title' | 'lead' | 'accept', Record<Lang, string>> = {
  title: {
    en: 'Before you continue',
    yue: '繼續之前',
    zh: '继续之前',
    ja: '続ける前に',
  },
  lead: {
    en: "Please review Amoji's Privacy Policy and Terms of Use, then tap Accept to enter the app.",
    yue: '請先睇吓 Amoji 私隱政策同使用條款，撳「接受」先入去。',
    zh: '请先阅读 Amoji 隐私政策与使用条款，点「接受」后进入应用。',
    ja: 'Amoji のプライバシーポリシーと利用規約を確認し、「同意する」を押して進んでください。',
  },
  accept: {
    en: 'Accept',
    yue: '接受',
    zh: '接受',
    ja: '同意する',
  },
};

export default function LegalGate() {
  const [prefs] = usePrefs();
  const lang = prefs.lang;
  const pathname = usePathname() || '';
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(true);

  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => setAccepted(hasAcceptedCurrentLegal());
    sync();
    setReady(true);
    return subscribeLegalAccept(sync);
  }, []);

  // Focus Accept when the gate opens; swallow Escape so it cannot dismiss
  // the mandatory click-to-accept dialog or leak to the page underneath.
  useEffect(() => {
    if (!ready || accepted) return;
    acceptRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ready, accepted]);

  // This gate is mandatory, so Tab must not walk out of it into the page
  // behind — that let a keyboard user skip accepting entirely.
  const gateRef = useFocusTrap<HTMLDivElement>(ready && !accepted);

  // Let users read the full Privacy/Terms pages without the blocking overlay.
  if (LEGAL_DOC_PATHS.has(pathname)) return null;

  // First paint: opaque blocker until localStorage is read. Returning users
  // see a brief black frame; first-run never glimpses select/chat underneath.
  if (!ready) {
    return (
      <div
        data-testid="legal-gate-boot"
        className="fixed inset-0 z-[10000] bg-neutral-950"
        aria-busy="true"
        aria-hidden="true"
      />
    );
  }

  if (accepted) return null;

  const privacy = privacySummary(lang);
  const terms = termsSummary(lang);
  return (
    <div
      ref={gateRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="amoji-legal-title"
      tabIndex={-1}
      data-testid="legal-gate"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 text-white shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Amoji</p>
          <h2 id="amoji-legal-title" className="mt-1 text-xl font-bold tracking-tight">
            {COPY.title[lang]}
          </h2>
          <p className="mt-2 text-sm text-white/70">{COPY.lead[lang]}</p>
          {/* The Accept tap IS the first interaction, so the AI disclosure
              belongs here and not only on the name step. */}
          <p className="mt-2 text-xs leading-relaxed text-white/50">{t(lang, 'aiNotice')}</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-white/80">
          <section>
            <h3 className="font-semibold text-white">{privacy.title}</h3>
            <p className="mt-1">{privacy.body}</p>
            <Link href="/privacy" aria-label={privacy.title} className="mt-2 inline-block text-xs text-pink-200/90 underline-offset-4 hover:underline">
              /privacy
            </Link>
          </section>
          <section>
            <h3 className="font-semibold text-white">{terms.title}</h3>
            <p className="mt-1">{terms.body}</p>
            <Link href="/terms" aria-label={terms.title} className="mt-2 inline-block text-xs text-pink-200/90 underline-offset-4 hover:underline">
              /terms
            </Link>
          </section>
          <section>
            <h3 className="font-semibold text-white">{t(lang, 'safetyTitle')}</h3>
            <p className="mt-1">{t(lang, 'safetyCrisisLine')}</p>
            <Link href="/safety" aria-label={t(lang, 'safetyTitle')} className="mt-2 inline-block text-xs text-pink-200/90 underline-offset-4 hover:underline">
              /safety
            </Link>
          </section>
          <p className="text-xs text-white/40">
            {t(lang, 'policyVersion')} {LEGAL_ACCEPT_VERSION}
          </p>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <button
            ref={acceptRef}
            type="button"
            data-testid="legal-accept"
            aria-label={COPY.accept[lang]}
            onClick={() => acceptCurrentLegal()}
            className="ui-btn ui-btn-primary h-12 w-full rounded-full bg-white text-base font-semibold text-black shadow-[0_10px_40px_-12px_rgba(255,255,255,0.45)]"
          >
            {COPY.accept[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
