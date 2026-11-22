// Bridge owner picker idle key-space (ID### / C## / lib#N / clipId).
// Picker rows emit ID040/ID041/ID050/ID126; the library code uses motion:C14…;
// the notes export carries whichever id the row had. One resolver so a future
// owner 採用/刪除 is machine-appliable instead of hand-translated.

import { IDLE_LIBRARY, type IdleLibraryEntry } from './idle-library';

export interface IdleOwnerCodeRow {
  /** Picker/library key: ID###. */
  code: string;
  libNum: number;
  /** free-library family code (C14…), null for app-only rows. */
  cId: string | null;
  clipId: string;
}

function codeFor(num: number): string {
  return `ID${String(num).padStart(3, '0')}`;
}

function canonCId(cId: string): string {
  const digits = Number(cId.replace(/^C/i, ''));
  return Number.isFinite(digits) ? `C${digits}` : cId.toUpperCase();
}

function toRow(e: IdleLibraryEntry): IdleOwnerCodeRow {
  return { code: codeFor(e.num), libNum: e.num, cId: e.cId, clipId: e.clipId };
}

const BY_LIB = new Map<number, IdleOwnerCodeRow>();
const BY_CID = new Map<string, IdleOwnerCodeRow>();
const BY_CLIP = new Map<string, IdleOwnerCodeRow>();

for (const e of IDLE_LIBRARY) {
  const row = toRow(e);
  BY_LIB.set(row.libNum, row);
  if (row.cId) BY_CID.set(canonCId(row.cId), row);
  BY_CLIP.set(row.clipId.toLowerCase(), row);
}

export function idleOwnerCode(libNum: number): string | null {
  return BY_LIB.get(libNum)?.code ?? null;
}

export function idleOwnerCodeRow(libNum: number): IdleOwnerCodeRow | undefined {
  return BY_LIB.get(libNum);
}

/** Resolve ID### / C## / lib#N / library clipId (case-insensitive). */
export function resolveIdleOwnerCode(raw: string | null | undefined): IdleOwnerCodeRow | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if (!key) return undefined;
  key = key.replace(/^(?:motion|idle):/i, '').trim();
  if (!key) return undefined;

  const byLib =
    key.match(/^ID0*(\d+)$/i) ??
    key.match(/^lib[#\-_ ]?0*(\d+)$/i) ??
    key.match(/^#0*(\d+)$/);
  if (byLib) return BY_LIB.get(Number(byLib[1]));

  const byCId = key.match(/^C0*(\d+)$/i);
  if (byCId) return BY_CID.get(`C${Number(byCId[1])}`);

  // HTML rows use `lib-<clipId>` / `rail-<n>-<clipId>` as data-id.
  const bareClip = key.replace(/^lib-/i, '').replace(/^rail-\d+-/i, '');
  return BY_CLIP.get(bareClip.toLowerCase());
}

/** All equivalent keys for a resolved row (for decision maps / tests). */
export function idleOwnerCodeAliases(raw: string | null | undefined): string[] {
  const row = resolveIdleOwnerCode(raw);
  if (!row) return [];
  const out = [row.code, row.clipId, `lib#${row.libNum}`];
  if (row.cId) out.push(row.cId);
  return [...new Set(out)];
}
