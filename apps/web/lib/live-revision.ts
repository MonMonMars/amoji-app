/** Network-only build stamp from `public/revision.txt` (see scripts/write-revision-txt.mjs). */
export async function fetchLiveRevision(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`./revision.txt?probe=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const t = (await res.text()).trim();
    return t || null;
  } catch {
    return null;
  }
}

/** True when Pages shipped a newer stamp than this tab's baked bundle. */
export function revisionStale(baked: string, live: string | null | undefined): boolean {
  const l = live?.trim();
  if (!l) return false;
  return l !== baked.trim();
}