'use client';
import { useEffect, useState } from 'react';
import { fetchLiveRevision, revisionStale } from '../lib/live-revision';
import { APP_REVISION } from '../lib/revision';

export interface LiveRevisionBadgeProps {
  id?: string;
  className?: string;
  /** Text before the revision stamp (e.g. `Amoji · `). */
  prefix?: string;
  /** Text after the stamp (e.g. ` · web demo`). */
  suffix?: string;
  refreshTestId?: string;
}

/** Baked `APP_REVISION` plus optional warn when `revision.txt` is newer (production only). */
export default function LiveRevisionBadge({
  id,
  className,
  prefix = '',
  suffix = '',
  refreshTestId = 'live-revision-refresh',
}: LiveRevisionBadgeProps) {
  const [liveRevision, setLiveRevision] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    void fetchLiveRevision().then(setLiveRevision);
  }, []);

  const stale = revisionStale(APP_REVISION, liveRevision);

  return (
    <p id={id} className={className}>
      {prefix}
      {APP_REVISION}
      {suffix}
      {stale && (
        <button
          type="button"
          data-testid={refreshTestId}
          onClick={() => window.location.reload()}
          className="ml-2 text-amber-300/90 underline underline-offset-2"
        >
          live {liveRevision} — Refresh
        </button>
      )}
    </p>
  );
}