'use client';

import type { ContentContinuationSession } from './content-continuation';

const KEY = 'amoji.contentContinuation.v1';

function canStore(): boolean {
  return typeof sessionStorage !== 'undefined';
}

export function loadContentContinuationSession(): ContentContinuationSession | null {
  if (!canStore()) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContentContinuationSession;
    if (!parsed?.topic || typeof parsed.startedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveContentContinuationSession(session: ContentContinuationSession): void {
  if (!canStore()) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch { /* private mode */ }
}

export function clearContentContinuationSession(): void {
  if (!canStore()) return;
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* */ }
}
