// Cards in the chat game fan. Add a row to grow the deck.
// v1 is Tag and Lane Dodge. Titles come from lines.ts.

import type { Lang } from '../prefs';
import { uiCopy } from './lines';
import type { ActionGame } from './types';

export interface GameCardDef {
  id: ActionGame;
  accent: string;
}

export const GAME_CARDS: readonly GameCardDef[] = [
  { id: 'tag', accent: '#86efac' },
  { id: 'lane', accent: '#93c5fd' },
];

export function gameCardCopy(kind: ActionGame, lang: Lang): { title: string; hint: string } {
  const ui = uiCopy(lang);
  if (kind === 'tag') return { title: ui.tagTitle, hint: ui.tagHint };
  return { title: ui.laneTitle, hint: ui.laneHint };
}
