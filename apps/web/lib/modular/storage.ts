'use client';
// Last head (identity) and body (outfit) on this device.
import { useEffect, useState } from 'react';
import { scheduleStatePush } from '../backend-client';
import { demoBodyById, demoHeadById, type ModularSelection } from './catalog';

const KEY = 'amoji.modular.v1';

export type ModularView = 'idle' | 'loading' | 'modular' | 'fallback';

type SelListener = (sel: ModularSelection | null) => void;
type ViewListener = (view: ModularView) => void;

const selListeners = new Set<SelListener>();
const viewListeners = new Set<ViewListener>();
let viewState: ModularView = 'idle';

function notifySel(sel: ModularSelection | null): void {
  for (const fn of selListeners) fn(sel);
}

export function loadModularSelection(): ModularSelection | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ModularSelection>;
    if (typeof p.headId !== 'string' || !demoHeadById(p.headId)) return null;
    if (typeof p.bodyId !== 'string' || !demoBodyById(p.bodyId)) return null;
    return { headId: p.headId, bodyId: p.bodyId };
  } catch {
    return null;
  }
}

export function saveModularSelection(sel: ModularSelection): void {
  if (!demoHeadById(sel.headId) || !demoBodyById(sel.bodyId)) return;
  try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* private mode */ }
  notifySel(sel);
  scheduleStatePush();
}

export function clearModularSelection(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  notifySel(null);
  scheduleStatePush();
}

export function subscribeModular(fn: SelListener): () => void {
  selListeners.add(fn);
  return () => { selListeners.delete(fn); };
}

export function publishModularView(view: ModularView): void {
  viewState = view;
  for (const fn of viewListeners) fn(view);
}

export function subscribeModularView(fn: ViewListener): () => void {
  viewListeners.add(fn);
  return () => { viewListeners.delete(fn); };
}

export function useModularSelection(): ModularSelection | null {
  const [sel, setSel] = useState<ModularSelection | null>(null);
  useEffect(() => {
    setSel(loadModularSelection());
    return subscribeModular(setSel);
  }, []);
  return sel;
}

export function useModularView(): ModularView {
  const [view, setView] = useState<ModularView>(viewState);
  useEffect(() => subscribeModularView(setView), []);
  return view;
}
