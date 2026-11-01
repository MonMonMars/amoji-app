'use client';
/**
 * First-run legal click-to-accept gate.
 * Blocks the app until Privacy + Terms are accepted for LEGAL_ACCEPT_VERSION.
 * Demo / placeholder copy — not final lawyer text.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LEGAL_ACCEPT_VERSION,
  acceptCurrentLegal,
  hasAcceptedCurrentLegal,
  subscribeLegalAccept,
} from '../lib/legal-accept';
import { usePrefs, type Lang } from '../lib/prefs';

const LEGAL_DOC_PATHS = new Set(['/privacy', '/terms']);

const COPY: Record<'title' | 'lead' | 'privacyTitle' | 'privacyBody' | 'termsTitle' | 'termsBody' | 'accept' | 'version', Record<Lang, string>> = {
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
  privacyTitle: {
    en: 'Privacy Policy (demo)',
    yue: '私隱政策（示範）',
    zh: '隐私政策（演示）',
    ja: 'プライバシー（デモ）',
  },
  privacyBody: {
    en: 'Amoji keeps your name, preferences, and chat memory on this device when possible. Optional cloud or keyed AI features only run when you turn them on. This demo summary is not final legal advice.',
    yue: 'Amoji 盡量將你個名、偏好同傾偈記憶留喺呢部裝置。雲端／自備 API 功能只會喺你開咗先用。呢段係示範摘要，唔係最終法律文本。',
    zh: 'Amoji 尽量把姓名、偏好与聊天记忆保存在本机。云端或自备密钥的 AI 功能仅在你开启后使用。本段为演示摘要，非最终法律文本。',
    ja: 'Amoji は可能な限り名前・設定・会話メモリをこの端末に保ちます。クラウドや API キー機能はあなたが有効にしたときだけ動きます。これはデモ要約であり最終的な法的文書ではありません。',
  },
  termsTitle: {
    en: 'Terms of Use (demo)',
    yue: '使用條款（示範）',
    zh: '使用条款（演示）',
    ja: '利用規約（デモ）',
  },
  termsBody: {
    en: 'Amoji is an entertainment companion demo. Do not rely on it for medical, legal, or emergency advice. You are responsible for how you use the app and any keys you provide. Placeholder terms — not final lawyer text.',
    yue: 'Amoji 係娛樂伴侶示範。唔好當佢醫療、法律或者緊急建議。你要為自己點用 App 同自己提供嘅 API key 負責。示範條款，唔係最終律師文本。',
    zh: 'Amoji 是娱乐伴侣演示。请勿将其作为医疗、法律或紧急建议。你需对自己如何使用本应用及提供的密钥负责。演示条款，非最终律师文本。',
    ja: 'Amoji は娯楽向けコンパニオンのデモです。医療・法律・緊急の助言として使わないでください。アプリの使い方と提供するキーはあなた自身の責任です。プレースホルダーであり最終的な法務文面ではありません。',
  },
  accept: {
    en: 'Accept',
    yue: '接受',
    zh: '接受',
    ja: '同意する',
  },
  version: {
    en: 'Policy version',
    yue: '政策版本',
    zh: '政策版本',
    ja: 'ポリシー版',
  },
};

export default function LegalGate() {
  const [prefs] = usePrefs();
  const lang = prefs.lang;
  const pathname = usePathname() || '';
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const sync = () => setAccepted(hasAcceptedCurrentLegal());
    sync();
    setReady(true);
    return subscribeLegalAccept(sync);
  }, []);

  // Let users read full demo Privacy/Terms pages without the blocking overlay.
  if (!ready || accepted || LEGAL_DOC_PATHS.has(pathname)) return null;

  const c = COPY;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="amoji-legal-title"
      data-testid="legal-gate"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 text-white shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Amoji</p>
          <h2 id="amoji-legal-title" className="mt-1 text-xl font-bold tracking-tight">
            {c.title[lang]}
          </h2>
          <p className="mt-2 text-sm text-white/70">{c.lead[lang]}</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-white/80">
          <section>
            <h3 className="font-semibold text-white">{c.privacyTitle[lang]}</h3>
            <p className="mt-1">{c.privacyBody[lang]}</p>
            <Link href="/privacy" className="mt-2 inline-block text-xs text-pink-200/90 underline-offset-4 hover:underline">
              /privacy
            </Link>
          </section>
          <section>
            <h3 className="font-semibold text-white">{c.termsTitle[lang]}</h3>
            <p className="mt-1">{c.termsBody[lang]}</p>
            <Link href="/terms" className="mt-2 inline-block text-xs text-pink-200/90 underline-offset-4 hover:underline">
              /terms
            </Link>
          </section>
          <p className="text-xs text-white/40">
            {c.version[lang]} {LEGAL_ACCEPT_VERSION}
          </p>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <button
            type="button"
            data-testid="legal-accept"
            onClick={() => acceptCurrentLegal()}
            className="ui-btn ui-btn-primary h-12 w-full rounded-full bg-white text-base font-semibold text-black shadow-[0_10px_40px_-12px_rgba(255,255,255,0.45)]"
          >
            {c.accept[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
