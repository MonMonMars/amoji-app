import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-900">
      <Link
        href="/play"
        className="rounded-lg bg-pink-500 px-6 py-3 text-white text-lg font-medium hover:bg-pink-400 transition-colors"
      >
        Meet Juno →
      </Link>
    </main>
  );
}
