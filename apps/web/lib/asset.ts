'use client';
// Static-asset URL helper — prepends the Pages base path (/amoji-app) at
// build time. Absolute https URLs (remote portraits / models) pass through
// unchanged so the registry-hosted cast assets load as-is.
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  // Idempotent: helpers like cmaReactionPath may already include basePath.
  if (base && (path === base || path.startsWith(base + '/'))) return path;
  return `${base}${path}`;
}


/** Undo assetUrl prefixing so path identity (CLIP_LIBRARY maps, etc.) stays
 *  stable whether callers pass bare /voice-clips/... or Pages /amoji-app/... */
export function stripBasePath(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!base) return path;
  if (path === base) return '/';
  if (path.startsWith(base + '/')) return path.slice(base.length) || '/';
  return path;
}
/** CharacterDef.model → fetchable URL: local cast paths under /models,
 *  absolute https URLs pass through, undefined in → undefined out. (r104) */
export function modelUrl(model?: string): string | undefined {
  if (!model) return undefined;
  if (/^https?:\/\//.test(model)) return model;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/models/${model}`;
}
