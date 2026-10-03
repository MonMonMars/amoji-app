// Dialogue-triggered movement library (r2026-10-03.39) — when the
// conversation turns to singing, jumping, kung fu, tai chi, piano or
// jogging, her BODY joins the topic: CompanionCanvas plays a choreographed
// procedural performance for a few seconds, the same overlay pattern as the
// giggle. The catalog mirrors the classic Mixamo / rigmodels movement
// families, so a real clip library (.vrma per character) can replace these
// procedural versions later by mapping the same kinds to clips.
// Pure data + math, no DOM — fully unit-testable in node.

export type MoveKind = 'sing' | 'jump' | 'kungfu' | 'taichi' | 'piano' | 'jog';

/** performance length per move, ms */
export const MOVE_DUR: Record<MoveKind, number> = {
  sing: 6000,
  jump: 2600,
  kungfu: 3200,
  taichi: 8000,
  piano: 6000,
  jog: 4000,
};

/**
 * Multilingual triggers — matched against BOTH the user's message and her
 * reply, so "show me some kung fu" and her own "好，睇我功夫！" both set her
 * off. Case-insensitive; priority order is the catalog order below.
 */
export const MOVE_TRIGGERS: Record<MoveKind, RegExp> = {
  sing: /(唱歌|唱首歌|唱k|一齊唱|一齐唱|唱吓|唱啊|唱啦|唱個|唱个|\bsing(?:ing)?\b|\bkaraoke\b|カラオケ|歌を歌|うたって)/i,
  jump: /(跳一下|跳吓|跳跳|跳起|跳啊|跳啦|跳舞|跳個舞|跳支舞|\bjump(?:ing)?\b|ジャンプ)/i,
  kungfu: /(功夫|武打|武術|武术|拳擊|拳击|\bkung\s?fu\b|martial arts|\bkarate\b|\bboxing\b|空手道|カンフー)/i,
  taichi: /(太極|太极|tai\s?chi)/i,
  piano: /(鋼琴|钢琴|彈琴|弹琴|彈鋼琴|弹钢琴|彈首|彈下|拉小提琴|\bpiano\b|\bviolin\b|\bguitar\b|ピアノ|バイオリン|ギター)/i,
  jog: /(跑步|慢跑|跑兩步|跑下步|\brun(?:ning)?\b|\bjog(?:ging)?\b|ジョギング|ランニング|走って)/i,
};

/** first matching move for a piece of dialogue, or undefined when none fits */
export function detectMove(text: string): MoveKind | undefined {
  for (const kind of Object.keys(MOVE_TRIGGERS) as MoveKind[]) {
    if (MOVE_TRIGGERS[kind].test(text)) return kind;
  }
  return undefined;
}

const TAU = Math.PI * 2;
const PI = Math.PI;
const sin = Math.sin;
const abs = Math.abs;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** ease in/out so every performance fades in and settles back to neutral */
export function moveEnvelope(t: number): number {
  const u = clamp01(t);
  const ramp = (x: number): number => {
    const v = clamp01(x / 0.12);
    return v * v * (3 - 2 * v);
  };
  return Math.min(ramp(u), ramp(1 - u));
}

/**
 * Raw additive bone/position deltas for a move at progress t (0..1).
 * Sign convention (CompanionCanvas adds these straight onto the node):
 *   leftUpperArm.z  + = arm raises  |  rightUpperArm.z − = arm raises
 *   leftLowerArm.z  − = elbow bends |  rightLowerArm.z  + = elbow bends
 *   upperArm.x      ± = reach forward/back (same sign both sides)
 *   spineX + = lean forward · spineY + = twist · chestZ + = side lean
 *   py = whole-body lift · squash = vertical squash · stretch = horizontal
 */
export interface MoveDeltas {
  lArmZ: number; rArmZ: number;
  lArmX: number; rArmX: number;
  lElbowZ: number; rElbowZ: number;
  spineX: number; spineY: number; chestZ: number;
  headX: number; headY: number; headZ: number;
  py: number; squash: number; stretch: number;
}

const NO_MOVE: MoveDeltas = {
  lArmZ: 0, rArmZ: 0, lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0,
  spineX: 0, spineY: 0, chestZ: 0, headX: 0, headY: 0, headZ: 0,
  py: 0, squash: 0, stretch: 0,
};

/** sample the choreography for a move at progress t (0..1) */
export function moveDeltas(kind: MoveKind, t: number): MoveDeltas {
  const u = clamp01(t);
  switch (kind) {
    case 'sing': {
      // idol-style: mic hand up by the mouth, grooving side to side ~3 cycles
      const beat = sin(u * PI * 6);
      const bounce = abs(beat);
      return {
        ...NO_MOVE,
        rArmZ: -0.7,          // mic hand raised
        rElbowZ: 0.35,        // crooked in toward the mouth
        lArmZ: 0.15,          // free hand loose, swaying slightly out
        lElbowZ: -0.1,
        chestZ: beat * 0.12,  // groove side to side
        spineY: beat * 0.14,
        headZ: beat * 0.07,
        headX: -0.06,         // chin up, into the song
        py: bounce * 0.02,
      };
    }
    case 'jump': {
      // three happy hops, arms flinging up each landing
      const hop = abs(sin(u * PI * 3));
      return {
        ...NO_MOVE,
        lArmZ: 0.5 * hop + 0.08,
        rArmZ: -0.5 * hop - 0.08,
        lElbowZ: -0.25 * hop,
        rElbowZ: 0.25 * hop,
        headX: -0.05 * hop,   // looking up mid-flight
        py: 0.16 * hop,
        squash: -0.07 * hop,  // squash & stretch on each bounce
        stretch: 0.05 * hop,
      };
    }
    case 'kungfu': {
      // guard stance → right punch → left punch → settle into a small bow
      const guard = u < 0.2 ? u / 0.2 : u > 0.85 ? (1 - u) / 0.15 : 1;
      const pR = sin(clamp01((u - 0.25) / 0.25) * PI);
      const pL = sin(clamp01((u - 0.5) / 0.25) * PI);
      const bow = clamp01((u - 0.85) / 0.15);
      return {
        ...NO_MOVE,
        lArmZ: 0.5 * guard + 0.25 * pL,
        rArmZ: -0.5 * guard - 0.25 * pR,
        lElbowZ: -(0.35 * guard) * (1 - 0.85 * pL), // striking arm extends
        rElbowZ: (0.35 * guard) * (1 - 0.85 * pR),
        spineY: -0.22 * pR + 0.22 * pL,             // hip into each strike
        spineX: 0.08 * (pR + pL) + 0.14 * bow,
        headX: 0.1 * bow,
        headY: 0.12 * pR - 0.12 * pL,
        py: -0.03 * guard - 0.02 * bow,             // rooted stance
      };
    }
    case 'taichi': {
      // slow flow: arms float up and sink, torso drawing one full circle
      const rise = sin(u * PI);
      const flow = sin(u * TAU);
      return {
        ...NO_MOVE,
        lArmZ: 0.55 * rise,
        rArmZ: -0.55 * rise,
        lElbowZ: -0.25 * rise,
        rElbowZ: 0.25 * rise,
        lArmX: -0.2 * rise,
        rArmX: -0.2 * rise,
        spineY: 0.18 * flow,
        chestZ: 0.07 * flow,
        headY: 0.1 * flow,
        py: -0.02 * rise,     // rooted lower as the arms rise
      };
    }
    case 'piano': {
      // seated at the keys, fingers rippling across an imaginary keyboard
      const ripple = sin(u * PI * 14);
      return {
        ...NO_MOVE,
        lArmX: -0.55,         // both arms forward to the keys
        rArmX: -0.55,
        lArmZ: 0.15,
        rArmZ: -0.15,
        lElbowZ: -(0.45 + 0.08 * ripple),
        rElbowZ: 0.45 + 0.08 * sin(u * PI * 14 + PI),
        headX: 0.08,          // eyes on the keys, nodding along
        headY: 0.08 * sin(u * PI * 4),
        chestZ: 0.05 * sin(u * PI * 4),
        py: -0.05,            // at the bench
      };
    }
    case 'jog': {
      // light run on the spot: opposite arm pump, four strides
      const stride = sin(u * PI * 8);
      const pump = abs(stride);
      return {
        ...NO_MOVE,
        lArmZ: 0.2,
        rArmZ: -0.2,
        lElbowZ: -(0.35 + 0.25 * stride),
        rElbowZ: 0.35 - 0.25 * stride,
        spineX: 0.14,         // lean into the run
        headX: -0.05,
        py: pump * 0.03,
        squash: -0.03 * pump,
        stretch: 0.02 * pump,
      };
    }
  }
}
