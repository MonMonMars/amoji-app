'use client';
/**
 * Legacy /safety URL — same view-only rules reader as /rules, scrolled to the
 * crisis section. Never the first-run Agree / START gate.
 */
import QuickSetup from '../../components/QuickSetup';

export default function SafetyPage() {
  return (
    <QuickSetup
      viewOnly
      showBack
      backTestId="rules-back"
      initialSectionId="setup-safety-heading"
    />
  );
}
