'use client';
/**
 * Shared 「即刻搵人傾」 helpline list — rules page + crisis warning popup.
 * Numbers come from `helplinesForRegion` (location-aware).
 */
import { helplinesForRegion, type Helpline, type HelplineRegion } from '../lib/crisis';

export function HelplineList({
  region,
  lines,
  testId = 'helpline-list',
}: {
  region?: HelplineRegion | null;
  /** Override when the parent already resolved the list. */
  lines?: Helpline[];
  testId?: string;
}) {
  const items = lines ?? helplinesForRegion(region ?? 'INTL');
  return (
    <ul className="mt-2 space-y-2" data-testid={testId} data-helpline-region={region ?? undefined}>
      {items.map((h) => (
        <li
          key={`${h.name}-${h.tel}`}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
        >
          <a
            href={`tel:${h.tel.replace(/[^0-9+]/g, '')}`}
            aria-label={`${h.name} ${h.tel}`}
            className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-pink-200 underline-offset-4 hover:underline"
          >
            <span className="font-medium">{h.name}</span>
            <span className="tabular-nums text-sm font-semibold text-white">{h.tel}</span>
          </a>
          <p className="mt-0.5 text-white/45">{h.where}</p>
        </li>
      ))}
    </ul>
  );
}
