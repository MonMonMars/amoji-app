'use client';
import Link from 'next/link';
import { LEGAL_ACCEPT_VERSION } from '../../lib/legal-accept';

/** Demo Terms of Use page — placeholder, not final lawyer text. */
export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-neutral-950 px-5 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Amoji</p>
      <h1 className="text-3xl font-bold">Terms of Use (demo)</h1>
      <p className="text-sm text-white/60">Policy version {LEGAL_ACCEPT_VERSION}. Placeholder copy for product gating — not final legal advice.</p>
      <div className="space-y-3 text-sm leading-relaxed text-white/80">
        <p>Amoji is an entertainment companion demo. Do not treat replies as medical, legal, financial, or emergency guidance.</p>
        <p>You are responsible for API keys you paste in, content you generate, and how you share the app with others.</p>
        <p>Features may change without notice in this open demo. Production terms will replace this page when counsel reviews them.</p>
      </div>
      <Link href="/" className="mt-4 text-sm text-pink-200 underline-offset-4 hover:underline">Back</Link>
    </main>
  );
}
