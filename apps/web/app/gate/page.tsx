'use client';
// /gate — mandatory first-run entry screen (18+ acknowledgement + audio check).
// Reached from /login before /select. See components/EntryGate.tsx for why the
// audio half is driven by the user's confirmation instead of a detection.
//
// The same gate also renders inline from RequireEntryGate, so a deep link to
// /select (or /change or /chat) can never skip it. This route owns the
// navigation because EntryGate itself stays a pure screen.
import { useRouter } from 'next/navigation';
import EntryGate from '../../components/EntryGate';

export default function Gate() {
  const router = useRouter();
  return <EntryGate onDone={() => router.replace('/select')} />;
}
