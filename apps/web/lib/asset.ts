'use client';
// Static-asset URL helper — prepends the Pages base path (/amoji-app) at
// build time. Absolute https URLs (remote portraits / models) pass through
// unchanged so the registry-hosted cast assets load as-is.
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}

/** CharacterDef.model → fetchable URL: local cast paths under /models,
 *  absolute https URLs pass through, undefined in → undefined out. (r104) */
export function modelUrl(model?: string): string | undefined {
  if (!model) return undefined;
  if (/^https?:\/\//.test(model)) return model;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/models/${model}`;
}
