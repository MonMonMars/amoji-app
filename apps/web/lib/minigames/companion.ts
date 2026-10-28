// Mini-game avatar: the companion the user picked, from the live want-list.
// Retired ids (juno, seed-san, bare sample filenames) are not a game mesh.
// v1 is female-only — a male pick falls back to the last female in prefs,
// then the default female companion.

import { CHARACTERS, DEFAULT_PREFS, characterById, femaleLibraryId, type CharacterDef } from '../prefs';

/** Want-list file for this character. Seed-san and other local demos are omitted. */
export function miniGameModelCandidates(model: string | undefined): string[] {
  if (!model || model.includes('seed-san')) return [];
  if (model.startsWith('want/') || /^https?:\/\//.test(model)) return [model];
  return [];
}

export function resolveMiniGameCompanion(selectedId: string, lastFemaleId?: string | null): CharacterDef {
  const selected = femaleLibraryId(selectedId);
  if (selected) return characterById(selected);
  const last = femaleLibraryId(lastFemaleId);
  if (last) return characterById(last);
  const fallback = femaleLibraryId(DEFAULT_PREFS.character)
    ?? CHARACTERS.find((c) => c.gender === 'female' && femaleLibraryId(c.id))?.id;
  return characterById(fallback ?? DEFAULT_PREFS.character);
}
