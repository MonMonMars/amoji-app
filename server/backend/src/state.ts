import type { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_STATE, isBackgroundId, isCharacterId, isLang, isWardrobePair, type Lang,
} from './catalog.js';

export interface CompanionState {
  characterId: string;
  backgroundId: string;
  lang: Lang;
  kidMode: boolean;
  wardrobe: { headId: string; bodyId: string } | null;
}

interface StateRow {
  character_id: string;
  background_id: string;
  lang: string;
  kid_mode: number;
}

interface WardrobeRow {
  head_id: string;
  body_id: string;
}

export interface StatePatch {
  characterId?: string;
  backgroundId?: string;
  lang?: string;
  kidMode?: boolean;
  wardrobe?: { headId: string; bodyId: string } | null;
}

export function readState(db: DatabaseSync, userId: string): CompanionState {
  const raw = db.prepare(
    'SELECT character_id, background_id, lang, kid_mode FROM character_state WHERE user_id = ?',
  ).get(userId);
  const wardrobe = db.prepare(
    'SELECT head_id, body_id FROM wardrobe WHERE user_id = ?',
  ).get(userId);
  const row = raw && typeof raw === 'object' ? raw as StateRow : undefined;
  const fit = wardrobe && typeof wardrobe === 'object' ? wardrobe as WardrobeRow : undefined;
  const lang = row && isLang(row.lang) ? row.lang : DEFAULT_STATE.lang;
  return {
    characterId: row?.character_id ?? DEFAULT_STATE.characterId,
    backgroundId: row?.background_id ?? DEFAULT_STATE.backgroundId,
    lang,
    kidMode: row ? row.kid_mode === 1 : DEFAULT_STATE.kidMode,
    wardrobe: fit ? { headId: fit.head_id, bodyId: fit.body_id } : null,
  };
}

export function writeState(db: DatabaseSync, userId: string, patch: StatePatch, now: number): CompanionState | { error: string } {
  const current = readState(db, userId);
  const next: CompanionState = { ...current, wardrobe: current.wardrobe ? { ...current.wardrobe } : null };
  if (patch.characterId !== undefined) {
    if (!isCharacterId(patch.characterId)) return { error: 'invalid characterId' };
    next.characterId = patch.characterId;
  }
  if (patch.backgroundId !== undefined) {
    if (!isBackgroundId(patch.backgroundId)) return { error: 'invalid backgroundId' };
    next.backgroundId = patch.backgroundId;
  }
  if (patch.lang !== undefined) {
    if (!isLang(patch.lang)) return { error: 'invalid lang' };
    next.lang = patch.lang;
  }
  if (patch.kidMode !== undefined) {
    if (typeof patch.kidMode !== 'boolean') return { error: 'invalid kidMode' };
    next.kidMode = patch.kidMode;
  }
  if (patch.wardrobe !== undefined) {
    if (patch.wardrobe === null) next.wardrobe = null;
    else if (!patch.wardrobe || !isWardrobePair(patch.wardrobe.headId, patch.wardrobe.bodyId)) {
      return { error: 'invalid wardrobe' };
    } else {
      next.wardrobe = { headId: patch.wardrobe.headId, bodyId: patch.wardrobe.bodyId };
    }
  }
  db.prepare(`
    INSERT INTO character_state (user_id, character_id, background_id, lang, kid_mode, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      character_id = excluded.character_id,
      background_id = excluded.background_id,
      lang = excluded.lang,
      kid_mode = excluded.kid_mode,
      updated_at = excluded.updated_at
  `).run(userId, next.characterId, next.backgroundId, next.lang, next.kidMode ? 1 : 0, now);
  if (next.wardrobe) {
    db.prepare(`
      INSERT INTO wardrobe (user_id, head_id, body_id, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        head_id = excluded.head_id,
        body_id = excluded.body_id,
        updated_at = excluded.updated_at
    `).run(userId, next.wardrobe.headId, next.wardrobe.bodyId, now);
  } else {
    db.prepare('DELETE FROM wardrobe WHERE user_id = ?').run(userId);
  }
  return next;
}
