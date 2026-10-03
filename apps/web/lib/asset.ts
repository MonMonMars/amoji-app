'use client';
// Static-asset URL helper — prepends the Pages base path (/amoji-app) at
// build time. Absolute https URLs (remote portraits / models) pass through
// unchanged so the registry-hosted cast assets load as-is.
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
