// Chat entry for the two action games. Kept separate from the turn-based
// games in lib/games.ts so a sentence about dice never opens the arena.

import type { ActionGame } from './types';

const TAG_RE = /(捕まえて|玩捉人|捉人遊戲|捉人游戏|鬼ごっこ|\bplay tag\b|\btag game\b)/i;
const LANE_RE = /(lane dodge|三線躲避|三线躲避|玩躲避|車道躲避|车道躲避)/i;
const LANE_SHORT = /^逃げて[！!〜~\s。．.]*$/;

/** A short chat command that should open Tag or Lane Dodge, or undefined. */
export function detectActionGame(text: string): ActionGame | undefined {
  const t = text.trim();
  if (!t || t.length > 64) return undefined;
  if (LANE_RE.test(t) || LANE_SHORT.test(t)) return 'lane';
  if (TAG_RE.test(t)) return 'tag';
  return undefined;
}
