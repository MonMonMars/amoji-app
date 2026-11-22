import { DEMO_PHASE_BUTTONS, type DemoPhaseButton, type DemoPhaseId } from './demo-phase';
import { CHAT_IDLE_CURATED, curatedRailByNum } from './idle-curated-rail';
import {
  committedOwnerPickerSelection,
  OWNER_PICKER_SELECTION_VERSION,
  type OwnerPickerSelectionShip,
} from './owner-picker-ship-set';
import { performanceClipOwnerCode } from './performance-clip-owner';
import { PERFORMANCE_CLIPS } from './performance-clips';
import { PERF_MOTION_TAGS, type MotionTag } from './performance-motion';
import { resolveIdleOwnerCode } from './idle-owner-code';
import {
  parseOwnerPickerNotesForIdle,
  type OwnerPickerNotesExport,
} from './owner-picker-notes';

export const OWNER_PICKER_NOTES_KEY = 'amoji.ownerPickerNotes.v1' as const;
export type OwnerPickerDecision = 'use' | 'keep' | 'delete';
type DecisionMap = Map<string, OwnerPickerDecision>;
let decisionCache: DecisionMap | null = null;

function aliasKeys(key: string): string[] {
  const k = key.trim();
  const out = new Set<string>([k]);
  if (/^MV\d+$/i.test(k)) out.add(k.toUpperCase());
  if (/^CMA\d+$/i.test(k)) out.add(k.toUpperCase());
  const rail = k.match(/^ID-R(\d+)$/i);
  if (rail) out.add(`rail-${Number(rail[1])}`);
  const rail2 = k.match(/^rail-(\d+)$/i);
  if (rail2) out.add(`ID-R${rail2[1]!.padStart(2, '0')}`);
  // ID### / lib#N / clip id → one decision for every equivalent idle key.
  // Bare C## only when it is not a performance-motion tag (C112 is both).
  const bareC = /^C\d+$/i.test(k);
  const idle = bareC && PERF_MOTION_TAGS.includes(k.toUpperCase() as MotionTag)
    ? undefined
    : resolveIdleOwnerCode(k);
  if (idle) {
    out.add(idle.code);
    out.add(idle.clipId);
    out.add(`lib#${idle.libNum}`);
    if (idle.cId) out.add(idle.cId);
  }
  return [...out];
}

function setDecision(map: DecisionMap, key: string, d: OwnerPickerDecision): void {
  for (const alias of aliasKeys(key)) map.set(alias, d);
}

function parseNotesExport(raw: string, map: DecisionMap): void {
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw) as Record<string, unknown>; } catch { return; }
  if (Array.isArray(data.use)) for (const k of data.use) if (typeof k === 'string') setDecision(map, k, 'use');
  if (Array.isArray(data.delete)) for (const k of data.delete) if (typeof k === 'string') setDecision(map, k, 'delete');
  if (Array.isArray(data.items)) {
    for (const entry of data.items) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const decision = row.decision;
      if (decision === 'use' || decision === 'keep' || decision === 'delete') {
        for (const k of [row.cd, row.domain, row.id]) if (typeof k === 'string') setDecision(map, k, decision);
      } else if (row.keep === false) {
        for (const k of [row.cd, row.domain, row.id]) if (typeof k === 'string') setDecision(map, k, 'delete');
      }
    }
  }
  // Idle rows need the ID### ↔ C## ↔ clipId bridge — the picker export uses
  // ID040/ID050/ID126 while runtime decisions are keyed by clipId.
  const idle = parseOwnerPickerNotesForIdle(data as OwnerPickerNotesExport);
  if (idle) {
    for (const clipId of idle.useClipIds) setDecision(map, clipId, 'use');
    for (const clipId of idle.deleteClipIds) setDecision(map, clipId, 'delete');
    for (const n of idle.useRailNums) {
      setDecision(map, `rail-${n}`, 'use');
      setDecision(map, `ID-R${String(n).padStart(2, '0')}`, 'use');
    }
    for (const n of idle.deleteRailNums) {
      setDecision(map, `rail-${n}`, 'delete');
      setDecision(map, `ID-R${String(n).padStart(2, '0')}`, 'delete');
    }
  }
}

function applyShipSet(map: DecisionMap, ship: OwnerPickerSelectionShip): void {
  for (const k of ship.use ?? []) setDecision(map, k, 'use');
  for (const k of ship.delete ?? []) setDecision(map, k, 'delete');
  for (const n of ship.idleRailNums ?? []) {
    setDecision(map, `rail-${n}`, 'use');
    setDecision(map, `ID-R${String(n).padStart(2, '0')}`, 'use');
  }
  // Clip 採用 does not turn on that clip's curated rail. Rails come from
  // idleRailNums / ID-R* so a Mixamo 採用 (C16/C18) cannot jump ahead of
  // ID-R05 or steal the sing-rail body clip.
  for (const clipId of ship.idleClipIds ?? []) {
    setDecision(map, clipId, 'use');
  }
}

function hydrateDecisions(): DecisionMap {
  if (decisionCache) return decisionCache;
  const map: DecisionMap = new Map();
  applyShipSet(map, committedOwnerPickerSelection());
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(OWNER_PICKER_NOTES_KEY) : null;
    if (raw) parseNotesExport(raw, map);
  } catch { /* */ }
  decisionCache = map;
  return map;
}

export function forgetOwnerPickerDecisionCache(): void { decisionCache = null; }
export function ownerPickerDecision(key: string): OwnerPickerDecision | null {
  for (const alias of aliasKeys(key)) { const d = hydrateDecisions().get(alias); if (d) return d; }
  return null;
}
export const isOwnerPickerDeleted = (k: string) => ownerPickerDecision(k) === 'delete';
export const isOwnerPickerUse = (k: string) => ownerPickerDecision(k) === 'use';

function idleKeys(clipId: string): string[] {
  const keys = [clipId];
  for (const row of CHAT_IDLE_CURATED) {
    if (row.clipId !== clipId) continue;
    keys.push(`rail-${row.railNum}`, `ID-R${String(row.railNum).padStart(2, '0')}`);
  }
  return keys;
}
export const ownerIdleClipDeleted = (id: string) => idleKeys(id).some(isOwnerPickerDeleted);
export const ownerIdleClipUse = (id: string) => idleKeys(id).some(isOwnerPickerUse);
export const ownerIdleRailDeleted = (n: number) => ownerIdleClipDeleted(curatedRailByNum(n)?.clipId ?? `rail-${n}`);
export const ownerIdleRailUse = (n: number) => isOwnerPickerUse(`rail-${n}`) || isOwnerPickerUse(`ID-R${String(n).padStart(2, '0')}`);
export const ownerMvDeleted = (c: string) => isOwnerPickerDeleted(c.trim().toUpperCase());
export const ownerMvUse = (c: string) => isOwnerPickerUse(c.trim().toUpperCase());
export const ownerSongClipDeleted = (id: string) => {
  const idx = PERFORMANCE_CLIPS.findIndex((c) => c.id === id);
  const keys = [id];
  if (idx >= 0) keys.push(performanceClipOwnerCode(idx + 1));
  return keys.some(isOwnerPickerDeleted);
};
export const ownerCmaDeleted = isOwnerPickerDeleted;
export const ownerCmaUse = isOwnerPickerUse;
export const ownerDemoPhaseDeleted = (id: DemoPhaseId) => isOwnerPickerDeleted(id);

export function applyOwnerIdleRailFilter(railNums: number[]): number[] {
  let next = railNums.filter((n) => !ownerIdleRailDeleted(n));
  for (const row of CHAT_IDLE_CURATED) {
    if (ownerIdleRailUse(row.railNum) && !next.includes(row.railNum)) next.push(row.railNum);
  }
  next = [...new Set(next)].sort((a, b) => a - b);
  return next.length ? next : railNums.filter((n) => !ownerIdleRailDeleted(n));
}

export function prioritizeOwnerUseIdleClips(clipIds: string[]): string[] {
  const use: string[] = [];
  const rest: string[] = [];
  const seen = new Set<string>();
  for (const id of clipIds) {
    if (ownerIdleClipDeleted(id) || seen.has(id)) continue;
    seen.add(id);
    (ownerIdleClipUse(id) ? use : rest).push(id);
  }
  return [...use, ...rest];
}

export function mergeOwnerListenMvCodes(codes: readonly string[]): string[] {
  const use: string[] = [];
  const keep: string[] = [];
  const seen = new Set<string>();
  const push = (c: string, bucket: 'use' | 'keep') => {
    const code = c.trim().toUpperCase();
    if (!code || seen.has(code) || ownerMvDeleted(code)) return;
    seen.add(code);
    (bucket === 'use' ? use : keep).push(code);
  };
  for (const c of codes) push(c, ownerMvUse(c) ? 'use' : 'keep');
  for (const c of committedOwnerPickerSelection().listenMvCodes ?? []) push(c, ownerMvUse(c) ? 'use' : 'keep');
  return [...use, ...keep];
}

export function mergeOwnerSongClipIds(ids: readonly string[]): string[] {
  const use: string[] = [];
  const keep: string[] = [];
  const seen = new Set<string>();
  const push = (id: string, bucket: 'use' | 'keep') => {
    if (!id || seen.has(id) || ownerSongClipDeleted(id)) return;
    seen.add(id);
    (bucket === 'use' ? use : keep).push(id);
  };
  for (const id of ids) {
    const idx = PERFORMANCE_CLIPS.findIndex((c) => c.id === id);
    const dc = idx >= 0 ? performanceClipOwnerCode(idx + 1) : id;
    push(id, isOwnerPickerUse(dc) || isOwnerPickerUse(id) ? 'use' : 'keep');
  }
  for (const id of committedOwnerPickerSelection().songClipIds ?? []) {
    const idx = PERFORMANCE_CLIPS.findIndex((c) => c.id === id);
    const dc = idx >= 0 ? performanceClipOwnerCode(idx + 1) : id;
    push(id, isOwnerPickerUse(dc) || isOwnerPickerUse(id) ? 'use' : 'keep');
  }
  return [...use, ...keep];
}

export function filterOwnerCmaCodes(codes: readonly string[]): string[] {
  const use: string[] = [];
  const rest: string[] = [];
  const seen = new Set<string>();
  for (const code of codes) {
    if (ownerCmaDeleted(code) || seen.has(code)) continue;
    seen.add(code);
    (ownerCmaUse(code) ? use : rest).push(code);
  }
  return [...use, ...rest];
}

export function ownerVisibleDemoPhaseButtons(): readonly DemoPhaseButton[] {
  return DEMO_PHASE_BUTTONS.filter((b) => !ownerDemoPhaseDeleted(b.id));
}

export function ownerPickerSelectionVersion(): string {
  return committedOwnerPickerSelection().version ?? OWNER_PICKER_SELECTION_VERSION;
}