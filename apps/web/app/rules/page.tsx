'use client';
/**
 * View-only rules / legal scroll for returning users (title bottom link).
 * No Agree / START and no audio-gate re-run — consent + mic unlock already happened.
 */
import QuickSetup from '../../components/QuickSetup';

export default function RulesPage() {
  return <QuickSetup viewOnly showBack backTestId="rules-back" />;
}
