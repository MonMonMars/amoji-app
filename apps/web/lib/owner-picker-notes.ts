export const OWNER_PICKER_NOTES_SCHEMA = 'owner-picker-notes-v2' as const;

export type OwnerDecision = 'use' | 'keep' | 'delete';

export interface OwnerPickerNoteRow {
  cd?: string;
  id?: string;
  ownerCode?: string;
  domainCode?: string;
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