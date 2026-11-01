'use client';
import Link from 'next/link';
import { LEGAL_ACCEPT_VERSION } from '../../lib/legal-accept';

/** Demo Privacy Policy page — placeholder, not final lawyer text. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-neutral-950 px-5 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Amoji</p>
      <h1 className="text-3xl font-bold">Privacy Policy (demo)</h1>
      <p className="text-sm text-white/60">Policy version {LEGAL_ACCEPT_VERSION}. Placeholder copy for product gating — not final legal advice.</p>
      <div className="space-y-3 text-sm leading-relaxed text-white/80">
        <p>Amoji stores profile name, language, mute, voice picks, and companion memory in this browser when possible.</p>
        <p>Optional networked AI or TTS hops run only when you enable them or supply your own keys. We do not sell personal chat contents in this demo framing.</p>
        <p>You can clear site data in the browser to wipe local Amoji storage. Contact the project maintainers for production privacy questions.</p>
      </div>
      <Link href="/" className="mt-4 text-sm text-pink-200 underline-offset-4 hover:underline">Back</Link>
    </main>
  );
}
