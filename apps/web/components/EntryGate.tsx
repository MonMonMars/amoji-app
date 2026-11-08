'use client';
/** Wrapper — one-click setup lives in QuickSetup.tsx */
import QuickSetup from './QuickSetup';

export default function EntryGate(props: { lang?: import('../lib/prefs').Lang; onDone?: () => void }) {
  return <QuickSetup {...props} />;
}
