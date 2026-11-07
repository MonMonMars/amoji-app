'use client';
// AI-generated-content reporting (Google Play: apps that generate content
// with a model must ship an in-app way to report offensive output).
//
// HONESTY CONSTRAINT — Amoji is a static site. GitHub Pages builds have no
// server of their own (see client-chat.ts / backend-client.ts), so a report
// CANNOT be transmitted when the user taps Save. Rather than invent a fake
// "sent to our server" flow, the report is written to localStorage on this
// device, the confirmation says exactly that, and the entry point to get it
// to the developer is a JSON export the user sends themselves.
//
// Versioned + bounded: the store is `{version, reports}` behind one key and
// keeps only the newest MAX_REPORTS entries — a report carries the reported
// reply text, so an unbounded list would eventually eat the storage quota
// that prefs/history/memory also depend on.

import type { Lang } from './prefs';

export const REPORTS_KEY = 'amoji.reports.v1';
export const REPORTS_VERSION = 1;
/** newest-first cap; older reports fall off the end */
export const MAX_REPORTS = 40;
/** a reply is clipped on the way in — the point is to see what was said */
export const MAX_REPLY_CHARS = 400;
/** the free-text field is a note, not an essay */
export const MAX_NOTE_CHARS = 500;

/** Store-review reason taxonomy. Order is the order the dialog renders. */
export const REPORT_REASONS = [
  'offensive',
  'minorSexual',
  'selfHarm',
  'harmfulAdvice',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function isReportReason(v: unknown): v is ReportReason {
  return typeof v === 'string' && (REPORT_REASONS as readonly string[]).includes(v);
}

export interface ReportEntry {
  id: string;
  /** ISO timestamp, so an exported file is readable without the app */
  at: string;
  reason: ReportReason;
  note: string;
  /** the AI reply that was reported, clipped to MAX_REPLY_CHARS */
  reply: string;
  /** which companion said it — useful context for the developer */
  characterId?: string;
  /** UI language at the time, so the developer can read the note in context */
  lang?: Lang;
  version: number;
}

export interface ReportInput {
  reason: ReportReason;
  note?: string;
  reply: string;
  characterId?: string;
  lang?: Lang;
}

/** The downloadable envelope — self-describing for whoever receives it. */
export interface ReportFile {
  format: 'amoji-reports';
  version: number;
  app: string;
  exportedAt: string;
  count: number;
  reports: ReportEntry[];
}

function clip(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

function isEntry(v: unknown): v is ReportEntry {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const e = v as Partial<ReportEntry>;
  return typeof e.id === 'string' && typeof e.at === 'string' && isReportReason(e.reason);
}

/** Newest first. Anything unreadable (private mode, old shape, junk) → []. */
export function loadReports(): ReportEntry[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const box = parsed as { version?: unknown; reports?: unknown };
    // A future version's shape is not ours to interpret.
    if (typeof box.version === 'number' && box.version > REPORTS_VERSION) return [];
    if (!Array.isArray(box.reports)) return [];
    return box.reports.filter(isEntry).slice(0, MAX_REPORTS).map((e) => ({
      ...e,
      note: typeof e.note === 'string' ? e.note : '',
      reply: typeof e.reply === 'string' ? e.reply : '',
      version: typeof e.version === 'number' ? e.version : REPORTS_VERSION,
    }));
  } catch { /* private mode / corrupt */ return []; }
}

function write(reports: ReportEntry[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify({
      version: REPORTS_VERSION,
      reports: reports.slice(0, MAX_REPORTS),
    }));
  } catch { /* full or blocked — the caller still shows the confirmation */ }
}

export function newReportId(now = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persist one report on this device. Returns the entry that was written —
 * or null when nothing could be stored (quota / blocked storage), so the UI
 * never claims a save that did not happen.
 */
export function addReport(input: ReportInput, at: Date = new Date()): ReportEntry | null {
  const entry: ReportEntry = {
    id: newReportId(at.getTime()),
    at: at.toISOString(),
    reason: isReportReason(input.reason) ? input.reason : 'other',
    note: clip(input.note, MAX_NOTE_CHARS),
    reply: clip(input.reply, MAX_REPLY_CHARS),
    version: REPORTS_VERSION,
    ...(input.characterId ? { characterId: input.characterId } : {}),
    ...(input.lang ? { lang: input.lang } : {}),
  };
  const next = [entry, ...loadReports()].slice(0, MAX_REPORTS);
  write(next);
  // A silent storage failure must not show up as "saved".
  return loadReports().some((r) => r.id === entry.id) ? entry : null;
}

export function reportCount(): number {
  return loadReports().length;
}

export function clearReports(): void {
  try { localStorage.removeItem(REPORTS_KEY); } catch { /* ignore */ }
}

/** The export payload — plain JSON, no app code required to read it. */
export function buildReportFile(revision: string, now: Date = new Date()): ReportFile {
  const reports = loadReports();
  return {
    format: 'amoji-reports',
    version: REPORTS_VERSION,
    app: `Amoji ${revision}`,
    exportedAt: now.toISOString(),
    count: reports.length,
    reports,
  };
}

/** Valid JSON for the download, and for anyone wanting to inspect it first. */
export function exportReportsJson(revision: string): string {
  return JSON.stringify(buildReportFile(revision), null, 2);
}

/** Trigger the browser download — `amoji-reports-<date>.json`. */
export function downloadReports(revision: string): boolean {
  const json = exportReportsJson(revision);
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return false;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amoji-reports-${day}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch { return false; }
}
