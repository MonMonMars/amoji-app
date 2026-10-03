// Dialogue-triggered movement library (r2026-10-03.39) — when the
// conversation turns to singing, jumping, kung fu, tai chi, piano or
// jogging, her BODY joins the topic: CompanionCanvas plays a choreographed
// procedural performance for a few seconds, the same overlay pattern as the
// giggle. The catalog mirrors the classic Mixamo / rigmodels movement
// families, so a real clip library (.vrma per character) can replace these
// procedural versions later by mapping the same kinds to clips.
// r2026-10-03.40: the sing performance now lasts a full 9s — long enough to
// carry an entire sung ditty, not just a pose.
// r2026-10-04.41: the catalog grows — violin gets her own performance
// (no longer misrouted to piano), and mealtime dialogue sets her eating:
// casual snacking (ice cream!) or an elegant fine-dining toast, depending
// on what you said.
// r2026-10-04.45: two trainer moves join the catalog for the exercise
// lessons — 'yoga' is a slow sun-salutation flow (arms sweep overhead,
// fold forward, half-lift, rise home) and 'stretch' is the warm-up set
// (arm circles into side bends with slow head rolls). Both ride the same
// additive overlay; 'r45 exercises.ts' drives them step by step.
// r2026-10-04.48: 'dance' joins the catalog — full idol choreography (six
// side-step grooves, alternating arm pumps, heel bounces and a mid-song
// turn). It sits at the FRONT of the trigger queue so 跳舞 / dance / ダンス
// stops falling through to 'jump'.
// Pure data + math, no DOM — fully unit-testable in node.

export type MoveKind =
  | 'dance'
  | 'sing' | 'jump' | 'kungfu' | 'taichi'
  | 'violin' | 'piano'
  | 'dine' | 'eat'
  | 'jog'
  | 'yoga' | 'stretch';

/** performance length per move, ms */
export const MOVE_DUR: Record<MoveKind, number> = {
  dance: 9000,
  sing: 9000,
  jump: 2600,
  kungfu: 3200,
  taichi: 8000,
  violin: 6000,
  piano: 6000,
  dine: 9000,
  eat: 7000,
  jog: 4000,
  yoga: 9000,
  stretch: 6000,
};

/**
 * Multilingual triggers — matched against BOTH the user's message and her
 * reply, so "show me some kung fu" and her own "好，睇我功夫！" both set her
 * off. Case-insensitive; priority order is the catalog order below.
 * r2026-10-04.41: violin is checked BEFORE piano (she has her own
 * performance now — 小提琴 / violin / バイオリン no longer lands on piano),
 * and dine is checked before eat so "一齊食大餐" gets the elegant toast,
 * not the casual munch.
 * r2026-10-04.45: yoga and stretch sit at the back of the queue (lowest
 * priority) — a lesson trigger in exercises.ts intercepts first, these
 * catch stray mentions inside ordinary replies.
 * r2026-10-04.48: dance leads the queue — 跳舞 / dance / ダンス / 踊って own
 * their own choreography now instead of degrading into a hop.
 */
export const MOVE_TRIGGERS: Record<MoveKind, RegExp> = {
  dance: /(跳舞|舞蹈|跳個舞|跳支舞|舞一段|\bdanc(?:e|ing)\b|ダンス|踊って|踊ろう)/i,
  sing: /(唱歌|唱首歌|唱k|一齊唱|一齐唱|唱吓|唱啊|唱啦|唱個|唱个|\bsing(?:ing)?\b|\bkaraoke\b|カラオケ|歌を歌|うたって)/i,
  jump: /(跳一下|跳吓|跳跳|跳起|跳啊|跳啦|\bjump(?:ing)?\b|ジャンプ)/i,
  kungfu: /(功夫|武打|武術|武术|拳擊|拳击|\bkung\s?fu\b|martial arts|\bkarate\b|\bboxing\b|空手道|カンフー)/i,
  taichi: /(太極|太极|tai\s?chi)/i,
  violin: /(小提琴|拉小提琴|\bviolin\b|バイオリン|ヴァイオリン)/i,
  piano: /(鋼琴|钢琴|彈琴|弹琴|彈鋼琴|弹钢琴|彈首|彈下|\bpiano\b|\bguitar\b|ピアノ|ギター)/i,
  dine: /(fine ?dining|燭光晚餐|烛光晚餐|共進晚餐|共进晚餐|一齊食大餐|一齐食大餐|食大餐|吃大餐|高級餐廳|高级餐厅|豪華晚餐|豪华晚餐|dinner date|燭光|烛光)/i,
  eat: /(食雪糕|吃雪糕|食雪條|食冰|雪糕|冰淇淋|冰激淋|食嘢|吃嘢|食飯|吃饭|一齊食|一齐食|開餐|开饭|請你食|请吃饭|\bice ?cream\b|食薯片)/i,
  jog: /(跑步|慢跑|跑兩步|跑下步|\brun(?:ning)?\b|\bjog(?:ging)?\b|ジョギング|ランニング|走って)/i,
  yoga: /(瑜伽|瑜珈|\byoga\b|ヨガ)/i,
  stretch: /(熱身|热身|暖身|拉筋|伸展|warm[- ]?up|ストレッチ)/i,
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
    case 'dance': {
      // r2026-10-04.48 — idol choreography: six side-step grooves with
      // alternating arm pumps and heel bounces, then a mid-song turn (the
      // twist is capped at 0.9 rad so the choreography audit stays bounded)
      const sway = sin(u * PI * 6);
      const pump = sin(u * PI * 12);
      const bounce = abs(sin(u * PI * 12));
      const turn = clamp01((u - 0.34) / 0.06) * (1 - clamp01((u - 0.5) / 0.08)) * 0.9;
      return {
        ...NO_MOVE,
        lArmZ: 0.3 + 0.45 * Math.max(0, pump),
        rArmZ: -0.3 - 0.45 * Math.max(0, -pump),
        lElbowZ: -(0.25 + 0.15 * bounce),
        rElbowZ: 0.25 + 0.15 * bounce,
        chestZ: sway * 0.14,
        spineY: sway * 0.16 + turn,
        headZ: sway * 0.08,
        headY: 0.1 * Math.max(0, -pump) - 0.05,
        py: bounce * 0.03,
        squash: -0.025 * bounce,
        stretch: 0.02 * bounce,
      };
    }
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
    case 'violin': {
      // r2026-10-04.41 — violinist stance: chin tucked onto the imaginary
      // violin at the left shoulder, left arm crooked under the neck, right
      // arm drawing the bow in long smooth strokes (~5 strokes)
      const bow = sin(u * PI * 10);
      const stroke = abs(bow);
      return {
        ...NO_MOVE,
        lArmZ: 0.75,                // violin arm raised across the body
        lArmX: -0.25,
        lElbowZ: -0.55,             // crooked, hand under the violin neck
        rArmZ: -0.35 - 0.1 * bow,   // bow arm sweeps out and back
        rArmX: -0.2,
        rElbowZ: 0.3 + 0.12 * stroke,
        headZ: 0.12,                // chin dropped onto the violin (left tilt)
        headY: -0.15,
        headX: 0.04,
        chestZ: 0.05 * bow,         // body sways with the long strokes
        py: -0.02,
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
    case 'dine': {
      // r2026-10-04.41 — fine dining with you: slow and elegant. A graceful
      // toast raise (first third), a savoring sip with an appreciative nod
      // (middle), then settling the glass back down; napkin on the left
      // hand the whole time.
      const raise = clamp01(u / 0.3) * (1 - clamp01((u - 0.55) / 0.3));
      const savor = sin(clamp01((u - 0.3) / 0.3) * PI);
      return {
        ...NO_MOVE,
        rArmZ: -0.15 - 0.45 * raise,  // the glass rises gracefully
        rArmX: -0.3 - 0.25 * raise,
        rElbowZ: 0.35 + 0.3 * raise,
        lArmZ: 0.25,                  // napkin resting at the lap edge
        lArmX: -0.2,
        lElbowZ: -0.35,
        headX: -0.05 + 0.1 * savor,   // chin dips, appreciating the sip
        headY: 0.1 * savor,
        chestZ: 0.04 * savor,
        py: -0.03,                    // seated
        squash: -0.015 * savor,       // contented little settle
      };
    }
    case 'eat': {
      // r2026-10-04.41 — happy snacking (ice cream!): right hand brings the
      // imaginary treat up for a bite, a munch-nod on arrival, left hand
      // cupped underneath so nothing drips; little chew tilts between bites
      const bite = Math.max(0, sin(u * PI * 8));    // ~4 bites
      const munch = Math.max(0, sin(u * PI * 16));  // chewing between bites
      return {
        ...NO_MOVE,
        rArmZ: -0.45,              // hand comes up in front of the face
        rArmX: -0.55,
        rElbowZ: 0.6 + 0.25 * bite,
        lArmZ: 0.3,                // cupped underneath
        lArmX: -0.3,
        lElbowZ: -0.4,
        headX: 0.06 + 0.08 * bite, // leans in to meet the bite
        headZ: 0.03 * munch,       // tiny chew tilts
        py: -0.01 * munch,
        squash: -0.02 * munch,     // contented bounce
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
    case 'yoga': {
      // r2026-10-04.45 — the trainer's sun salutation (Wii Fit yoga): arms
      // sweep overhead, fold forward with a soft knee, half-lift into a flat
      // back, then rise home to mountain. Smoothstep phases keep the flow
      // continuous; the envelope fades the whole thing in and out.
      const ss = (x: number): number => {
        const v = clamp01(x);
        return v * v * (3 - 2 * v);
      };
      const armsUp = ss(u / 0.22) * (1 - ss((u - 0.42) / 0.18));
      const fold = ss((u - 0.3) / 0.2) * (1 - ss((u - 0.6) / 0.25));
      const lift = ss((u - 0.55) / 0.1) * (1 - ss((u - 0.75) / 0.2));
      return {
        ...NO_MOVE,
        lArmZ: 0.75 * armsUp + 0.12 * lift,   // arms overhead, then sweep down
        rArmZ: -0.75 * armsUp - 0.12 * lift,
        lElbowZ: -0.12 * armsUp,
        rElbowZ: 0.12 * armsUp,
        spineX: 0.48 * fold - 0.08 * lift,    // forward fold, flat-back lift
        headX: 0.14 * fold - 0.1 * lift,      // chin to shins, then gaze forward
        py: -0.05 * fold,                     // sink a little into the fold
      };
    }
    case 'stretch': {
      // r2026-10-04.45 — the warm-up set: double arm circles flowing into
      // alternating side bends, slow head rolls on top, a light bounce
      // underneath so it reads bouncy, not sleepy. Two cycles in 6s.
      const circle = sin(u * TAU * 2);
      const bend = sin(u * TAU * 2 + PI / 2);
      const roll = sin(u * TAU);
      return {
        ...NO_MOVE,
        lArmZ: 0.45 + 0.22 * circle,          // both arms circling overhead
        rArmZ: -0.45 + 0.22 * circle,
        lElbowZ: -0.18,
        rElbowZ: 0.18,
        lArmX: 0.2 * bend,
        rArmX: 0.2 * bend,
        chestZ: 0.13 * bend,                  // side bends
        headZ: 0.09 * roll,                   // slow head rolls
        headY: 0.07 * sin(u * TAU + PI / 2),
        py: 0.02 * abs(circle),               // light bounce
      };
    }
  }
}
