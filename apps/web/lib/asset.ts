'use client';
// Static-asset URL helper — prepends the Pages base path (/amoji-app) at build time.
export function assetUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
