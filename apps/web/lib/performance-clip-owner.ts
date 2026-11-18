import { PERFORMANCE_CLIPS } from './performance-clips';

/** DC### — owner dance/sing performance library clip ids (CC0/PD files). */
export function performanceClipOwnerCode(index1: number): string {
  return `DC${String(index1).padStart(3, '0')}`;
}

export const PERFORMANCE_CLIP_OWNER_CODES: readonly string[] = PERFORMANCE_CLIPS.map((_, i) =>
  performanceClipOwnerCode(i + 1),
);

export function performanceClipOwnerCodeForId(clipId: string): string | undefined {
  const idx = PERFORMANCE_CLIPS.findIndex((c) => c.id === clipId);
  return idx >= 0 ? performanceClipOwnerCode(idx + 1) : undefined;
}