'use client';
/**
 * First-run rules gate (Agree / START → /gate/audio).
 * `?view=1` opens the same scroll as /rules — content only, no consent re-run.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuickSetup from '../../components/QuickSetup';

function SetupInner() {
  const params = useSearchParams();
  const viewOnly = params.get('view') === '1';
  return (
    <QuickSetup
      viewOnly={viewOnly}
      showBack
      backTestId={viewOnly ? 'rules-back' : 'setup-back'}
    />
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <main data-testid="setup-boot" className="min-h-dvh bg-neutral-950" aria-busy="true" />
      }
    >
      <SetupInner />
    </Suspense>
  );
}
