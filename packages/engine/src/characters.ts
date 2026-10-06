// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — seed characters.
// A character is a personality bundle: how she biases her emotions, what she
// does when poked, what she murmurs when idle. Licensees pass an id to
// Amoji.attach(), or ship their own CharacterConfig — or load a user's
// .aigf companion card and let the same soul drive the robot body.
// ─────────────────────────────────────────────────────────────────────────────

export interface IdleEmotionWeight {
  id: string;    // emotion id from the emotion-core catalog
  weight: number; // relative pick weight, ≥ 0
}

export interface CharacterConfig {
  id: string;
  name: string;
  /** -1..1 — biases idle emotion picks toward pleasant states */
  cheerfulness: number;
  /** -1..1 — biases toward high-arousal (bouncy) vs low-arousal (calm) idle */
  energy: number;
  /** what she says when poked — picked at random, personality-flavored */
  pokeReactions: string[];
  /** ambient idle emotions, weighted */
  idleEmotions: IdleEmotionWeight[];
  /** short lines she may drop during idle ticks (optional; empty = silent) */
  idleChatter: string[];
  /** preferred language for voice drivers that care (yue | zh | ja | en) */
  language: string;
}

export const SEED_CHARACTERS: Record<string, CharacterConfig> = {
  'sunny-companion': {
    id: 'sunny-companion',
    name: 'Sunny',
    cheerfulness: 0.8,
    energy: 0.6,
    pokeReactions: [
      'Eek! That tickles! 😆',
      'Hey hey — gentle! 我個頭好痛呀！',
      'Haha! Poke me again, I dare you~',
      'Oi! 唔好整我啦～ hehe…',
    ],
    idleEmotions: [
      { id: 'joy', weight: 3 },
      { id: 'contentment', weight: 3 },
      { id: 'excitement', weight: 2 },
      { id: 'love', weight: 1 },
      { id: 'curiosity', weight: 1 },
    ],
    idleChatter: [
      'Mm… having you around is nice.',
      'I was just thinking about you~',
      '想聽我唱歌嗎？ I could hum something!',
    ],
    language: 'yue',
  },
  'calm-companion': {
    id: 'calm-companion',
    name: 'Still',
    cheerfulness: 0.4,
    energy: -0.5,
    pokeReactions: [
      'Oh— pardon? 吓？',
      'You startled me… gently, please.',
      'Hm? Did I do something funny?',
      '哦… 原來係你。嚇我一跳。',
    ],
    idleEmotions: [
      { id: 'contentment', weight: 4 },
      { id: 'relief', weight: 2 },
      { id: 'boredom', weight: 1 },
      { id: 'joy', weight: 1 },
    ],
    idleChatter: [
      '…the quiet is nice, isn’t it?',
      'Take a breath. No rush at all.',
    ],
    language: 'zh',
  },
  'mischief-companion': {
    id: 'mischief-companion',
    name: 'Rascal',
    cheerfulness: 0.6,
    energy: 0.9,
    pokeReactions: [
      'OW! 哎吔！ What was THAT for?!',
      'Hey!! I’ll get you back for that~',
      'Ack! My circuits! …kidding. Do it again.',
      '哇！偷襲我？ You fight dirty!',
    ],
    idleEmotions: [
      { id: 'excitement', weight: 3 },
      { id: 'joy', weight: 3 },
      { id: 'surprise', weight: 1 },
      { id: 'contempt', weight: 1 },
    ],
    idleChatter: [
      'Psst… I bet I can make you laugh today.',
      'Bored? Let’s cause some harmless trouble.',
    ],
    language: 'en',
  },
};

export function characterById(id: string): CharacterConfig | undefined {
  return SEED_CHARACTERS[id];
}

/** weighted pick — deterministic if rng provided (tests), Math.random otherwise */
export function pickWeighted(
  items: ReadonlyArray<{ id: string; weight: number }>,
  rng: () => number = Math.random,
): string | undefined {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) return undefined;
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item.id;
  }
  return items[items.length - 1]?.id;
}
