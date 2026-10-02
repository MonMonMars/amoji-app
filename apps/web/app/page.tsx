import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-white">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-pink-400" />
        <h1 className="text-4xl font-bold tracking-tight">Amoji</h1>
      </div>
      <p className="max-w-md text-center text-white/60">
        An AI companion who laughs, sulks, and stays with you.
        <br />
        <span className="text-white/40">識笑、識嬲、識陪住你。</span>
      </p>
      <Link
        href="/setup"
        className="rounded-full bg-white px-8 py-3 text-base font-semibold text-black transition hover:bg-white/85"
      >
        Meet your companion →
      </Link>
      <Link href="/play" className="text-sm text-white/40 underline-offset-4 hover:underline">
        skip setup
      </Link>
    </main>
  );
}
