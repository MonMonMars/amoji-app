'use client';
/**
 * Renders the entry gate INSTEAD of a protected screen until the 18+ / audio
 * gate has been answered.
 *
 * Why render-swap rather than a redirect: a redirect guard lets the protected
 * page mount and paint first, then bounce. On /select that is not cosmetic —
 * the board would start loading the VRM cast and play a greeting voice, and
 * the user would see the app before being asked whether they are an adult. A
 * render-swap means the protected screen never mounts at all.
 *
 * The gate is also the place the redirect used to end up (/gate renders the
 * same component standalone for the login → gate path), so both routes behave
 * identically.
 */
import { useSyncExternalStore, type ReactNode } from 'react';
import { hasPassedEntryGate, subscribeEntryGate } from '../lib/entry-gate';
import EntryGate from './EntryGate';

export default function RequireEntryGate({ children }: { children: ReactNode }) {
  const passed = useSyncExternalStore(
    (onStoreChange) => subscribeEntryGate(() => onStoreChange()),
    hasPassedEntryGate,
    () => null as boolean | null,
  );

  // First paint: an opaque blocker. Returning null here would let the page
  // underneath show for a frame, which is exactly what this component exists
  // to prevent.
  if (passed === null) {
    return (
      <div
        data-testid="entry-gate-boot"
        className="fixed inset-0 z-[9000] bg-neutral-950"
        aria-busy="true"
        aria-hidden="true"
      />
    );
  }

  if (!passed) {
    return <EntryGate />;
  }

  return <>{children}</>;
}