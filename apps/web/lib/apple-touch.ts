/** iPhone / iPad / iPod, including iPadOS 13+ desktop UA. */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports Macintosh; a Mac trackpad stays at maxTouchPoints 0.
  if (/Macintosh|Mac OS X/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true;
  return false;
}
