import { resolveIdleOwnerCode } from './idle-owner-code';

export const OWNER_PICKER_NOTES_SCHEMA = 'owner-picker-notes-v2' as const;

export type OwnerDecision = 'use' | 'keep' | 'delete';

export interface OwnerPickerNoteRow {
  cd?: string;
  id?: string;
  ownerCode?: string;
  domainCode?: string;
  prefix?: string;
  ref?: string;
  decision?: OwnerDecision | string;
  keep?: boolean;
  note?: string;
}

export interface OwnerPickerNotesExport {
  version?: string;
  items?: OwnerPickerNoteRow[];
  use?: OwnerPickerNoteRow[];
  keep?: OwnerPickerNoteRow[];
  delete?: OwnerPickerNoteRow[];
  deleteCd?: string[];
  removeCd?: string[];
}

function normMv(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^MV\d+$/.test(t)) return t;
  const digits = t.replace(/\D/g, '');
  return digits ? `MV${digits.padStart(3, '0')}` : t;
}

function rowDecision(row: OwnerPickerNoteRow): OwnerDecision {
  const d = row.decision;
  if (d === 'use' || d === 'keep' || d === 'delete') return d;
  if (row.keep === true) return 'keep';
  if (row.keep === false) return 'delete';
  return 'keep';
}

function collectRows(exp: OwnerPickerNotesExport): OwnerPickerNoteRow[] {
  const out: OwnerPickerNoteRow[] = [];
  const push = (rows?: OwnerPickerNoteRow[]) => rows?.length && out.push(...rows);
  push(exp.items);
  push(exp.use);
  push(exp.keep);
  push(exp.delete);
  return out;
}

export interface ParsedOwnerMusicDecisions {
  listenMvCodes: string[];
  songClipIds: string[];
  danceClipIds: string[];
  deletedMvCodes: string[];
  deletedClipIds: string[];
}

export function parseOwnerPickerNotesForMusic(
  exp: OwnerPickerNotesExport | null | undefined,
): ParsedOwnerMusicDecisions | null {
  if (!exp) return null;
  const listenUse = new Set<string>();
  const clipUse = new Set<string>();
  const clipDance = new Set<string>();
  const mvDel = new Set<string>();
  const clipDel = new Set<string>();

  for (const row of collectRows(exp)) {
    const decision = rowDecision(row);
    const domain = (row.domainCode ?? row.id ?? '').toString().toUpperCase();
    const id = (row.id ?? '').toString();
    if (domain.startsWith('MV') || /^MV\d+/i.test(id)) {
      const mv = normMv(domain.startsWith('MV') ? domain : id);
      if (decision === 'delete') mvDel.add(mv);
      else if (decision === 'use') listenUse.add(mv);
      continue;
    }
  if (/^(sing-|bed-|dance-)/.test(id)) {
      if (decision === 'delete') clipDel.add(id);
      else if (decision === 'use') {
        if (id.startsWith('sing-')) clipUse.add(id);
        else clipDance.add(id);
      }
    }
  }
  for (const mv of exp.deleteCd ?? exp.removeCd ?? []) mvDel.add(normMv(mv));

  return {
    listenMvCodes: [...listenUse],
    songClipIds: [...clipUse],
    danceClipIds: [...clipDance],
    deletedMvCodes: [...mvDel],
    deletedClipIds: [...clipDel],
  };
}

export function parseOwnerPickerNotesJson(raw: string): OwnerPickerNotesExport | null {
  try {
    return JSON.parse(raw) as OwnerPickerNotesExport;
  } catch {
    return null;
  }
}

export interface ParsedOwnerIdleDecisions {
  useClipIds: string[];
  deleteClipIds: string[];
  useRailNums: number[];
  deleteRailNums: number[];
}

/**
 * Bridge picker idle key-space → clipIds / rail #s.
 * ID### / lib#N / library clipId / rail-row id all resolve; bare C## is only
 * trusted when the row ref is an idle SoT (C112 also names a perf-motion tag).
 */
export function parseOwnerPickerNotesForIdle(
  exp: OwnerPickerNotesExport | null | undefined,
): ParsedOwnerIdleDecisions | null {
  if (!exp) return null;
  const useClips = new Set<string>();
  const deleteClips = new Set<string>();
  const useRails = new Set<number>();
  const deleteRails = new Set<number>();

  for (const row of collectRows(exp)) {
    const decision = rowDecision(row);
    if (decision !== 'use' && decision !== 'delete') continue;
    const ref = (row.ref ?? '').toLowerCase();
    const idleRef = /idle-(library|curated-rail|owner-ref)/.test(ref);

    for (const raw of [row.domainCode, row.id, row.ownerCode]) {
      if (!raw) continue;
      const key = raw.trim();
      if (!key) continue;

      const rail = key.match(/^ID-R0*(\d+)$/i) ?? key.match(/^rail-0*(\d+)(?:-|$)/i);
      if (rail) {
        const n = Number(rail[1]);
        if (Number.isInteger(n) && n > 0) (decision === 'use' ? useRails : deleteRails).add(n);
        continue;
      }

      // Bare C## is ambiguous with performance-motion tags — require idle ref.
      if (/^C\d+$/i.test(key) && !idleRef) continue;

      const resolved = resolveIdleOwnerCode(key);
      if (!resolved) continue;
      (decision === 'use' ? useClips : deleteClips).add(resolved.clipId);
    }
  }

  return {
    useClipIds: [...useClips],
    deleteClipIds: [...deleteClips],
    useRailNums: [...useRails].sort((a, b) => a - b),
    deleteRailNums: [...deleteRails].sort((a, b) => a - b),
  };
}
