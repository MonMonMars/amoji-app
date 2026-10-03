// r2026-10-04.45: "follow the trainer" exercise lessons — Wii Fit's core
// loop, researched from the 2007 original: a calm trainer demos each move,
// counts you through it with breathing cues, and encourages constantly.
// Design pillars stolen: (1) poses held with inhale/exhale cues, (2) counted
// reps for the energetic stuff, (3) relentless encouragement, (4) a gentle
// cooldown and a "same time tomorrow?" closer. Yoga/tai chi get a slow
// soothing voice, kung fu/warm-up an energetic one. LLM-free: the lesson
// runs entirely on this deterministic step engine, so it works even when
// the brain is slow or out of credit — she leads, you follow, one message
// per step. Pure data, no DOM — fully unit-testable in node. Every line
// ends with a question or invitation (continuity rule), and every step
// demos a move from the movement library ('yoga'/'stretch' join the
// catalog in r45, alongside the existing taichi/kungfu/jump performances).

import type { MoveKind } from './moves';

export type ExerciseKind = 'yoga' | 'taichi' | 'kungfu' | 'warmup';
export type ExLang = 'yue' | 'zh' | 'ja' | 'en';

export interface ExerciseState {
  kind: ExerciseKind;
  /** index of the NEXT step cue to deliver */
  step: number;
}

export interface ExerciseStep {
  cue: Record<ExLang, string>;
  move: MoveKind;
}

export interface ExerciseRoutine {
  kind: ExerciseKind;
  start: Record<ExLang, string>;
  steps: ExerciseStep[];
  done: Record<ExLang, string>;
  quit: Record<ExLang, string>;
  /** the demo move that plays while the intro is spoken */
  startMove: MoveKind;
  /** face/orb hints worn for the whole lesson */
  hints: Record<string, number>;
}

export interface ExerciseTurn {
  line: string;
  state: ExerciseState | null;
  move: MoveKind;
  hints?: Record<string, number>;
}

const YOGA_RE = /(瑜伽|瑜珈|\byoga\b|ヨガ)/i;
const TAICHI_RE = /(太極|太极|tai\s?chi)/i;
const KUNGFU_RE = /(功夫|武打|武術|武术|拳擊|拳击|\bkung\s?fu\b|martial arts|\bkarate\b|空手道|カンフー)/i;
const WARMUP_RE = /(熱身|热身|暖身|拉筋|伸展|warm[- ]?up|ストレッチ)/i;
const UMBRELLA_RE = /(做運動|做运动|一齊運動|一齐运动|鍛煉|锻炼|做gym|健身|\bexercise\b|跟住我做|跟著我做|follow me|運動一下)/i;

export const EXERCISE_KINDS: ExerciseKind[] = ['yoga', 'taichi', 'kungfu', 'warmup'];

/** the lesson to start for a message, or undefined for normal chat */
export function detectExercise(text: string): ExerciseKind | undefined {
  if (YOGA_RE.test(text)) return 'yoga';
  if (TAICHI_RE.test(text)) return 'taichi';
  if (KUNGFU_RE.test(text)) return 'kungfu';
  if (WARMUP_RE.test(text)) return 'warmup';
  if (UMBRELLA_RE.test(text)) return 'warmup'; // generic "exercise" → gentle warm-up
  return undefined;
}

export const ROUTINES: Record<ExerciseKind, ExerciseRoutine> = {
  // ------------------------------------------------------------------ yoga
  yoga: {
    kind: 'yoga',
    start: {
      yue: '好呀，瑜伽時間！我會一個動作一個動作教你——企喺度，放鬆膊頭，準備好未？',
      zh: '好呀，瑜伽时间！我会一个动作一个动作教你——站好，放松肩膀，准备好了吗？',
      ja: 'よし、ヨガの時間！一つずつ教えるね——立って、肩をリラックスして、準備OK？',
      en: "Sure thing — yoga time! I'll teach you one move at a time — stand tall, relax your shoulders, ready?",
    },
    steps: [
      {
        cue: {
          yue: '第一步，山式深呼吸：雙腳同膊頭咁闊，雙手合十——吸氣…慢慢呼氣，成個人放鬆晒，feel 到未？',
          zh: '第一步，山式深呼吸：双脚和肩膀同宽，双手合十——吸气…慢慢呼气，整个人放松下来，感觉到了吗？',
          ja: '最初は山のポーズで深呼吸：足は肩幅、両手を合わせて——吸って…ゆっくり吐いて、全身をリラックス、感じる？',
          en: 'First, mountain breathing: feet shoulder-width apart, palms together — breathe in… and slowly out, let everything melt. Feel that?',
        },
        move: 'yoga',
      },
      {
        cue: {
          yue: '跟住係樹式：一隻腳掌貼住另一邊小腿，雙手舉高過頭頂——眼望實前面一點，平衡到未？',
          zh: '接下来是树式：一只脚掌贴住另一边小腿，双手举过头顶——眼睛盯住前面一个点，平衡住了吗？',
          ja: '次は木のポーズ：片足をもう片方のふくらはぎに、両手を頭の上へ——目は前の一点を見つめて、バランス取れてる？',
          en: 'Now tree pose: rest one foot on the other calf, arms up overhead — lock your eyes on one spot ahead. Holding steady?',
        },
        move: 'yoga',
      },
      {
        cue: {
          yue: '而家轉戰士式：一隻腳向前大弓步，雙手向左右打開——哇，好有氣勢！頂唔頂得順？',
          zh: '现在转战士式：一只脚向前大弓步，双手向左右打开——哇，好有气势！顶得住吗？',
          ja: '続いて戦士のポーズ：片足を大きく前に出して、両手を左右へ——わあ、すごい気迫！キープできる？',
          en: 'Into warrior pose now: big lunge forward, arms wide — whoa, you look powerful! Can you hold it?',
        },
        move: 'yoga',
      },
      {
        cue: {
          yue: '最後慢慢向下趴，手掌撐地，上半身上抬——眼鏡蛇式！跟住呼吸…好叻㗎你！舒唔舒服？',
          zh: '最后慢慢向下趴，手掌撑地，上半身上抬——眼镜蛇式！跟着呼吸…好厉害呀你！舒服吗？',
          ja: '最後はゆっくりうつ伏せで、手をついて上半身を起こして——コブラのポーズ！呼吸を続けて…えらいね！気持ちいい？',
          en: 'Last one, ease down onto your front, palms down, lift your chest — cobra! Keep breathing… you nailed it! How does your back feel?',
        },
        move: 'yoga',
      },
    ],
    done: {
      yue: '好喇，今日嘅瑜伽堂到此為止——你做得好好㗎！聽日再一齊練過好唔好？',
      zh: '好啦，今天的瑜伽课到此为止——你做得非常好！明天再一起练好不好？',
      ja: 'はい、今日のヨガはここまで——とっても上手だったよ！明日も一緒にやろう？',
      en: "Lovely, that's today's yoga session — you did so well! Same time tomorrow?",
    },
    quit: {
      yue: '唔緊要，休息一下先！想再練嗰陣隨時叫我吖？',
      zh: '不要紧，先休息一下！想再练的时候随时叫我呀？',
      ja: '大丈夫、まず休憩！またやりたくなったらいつでも呼んで？',
      en: 'No worries, take a breather! Call me anytime you want to practice again?',
    },
    startMove: 'yoga',
    hints: { relaxed: 0.75, joy: 0.25 },
  },
  // ---------------------------------------------------------------- taichi
  taichi: {
    kind: 'taichi',
    start: {
      yue: '好，太極拳——慢慢嚟，唔使急，跟住我嘅呼吸就得，準備好未？',
      zh: '好，太极拳——慢慢来，不用急，跟着我的呼吸就好，准备好了吗？',
      ja: 'よし、太極拳——ゆっくりでいいから、僕の呼吸についていって、準備はいい？',
      en: 'Okay, tai chi — nice and slow, no rush, just follow my breathing. Ready?',
    },
    steps: [
      {
        cue: {
          yue: '起勢：雙腳慢慢分開，雙手似抱住個大氣球噉升起——吸…呼…感唔感覺到個「圓」？',
          zh: '起势：双脚慢慢分开，双手像抱住一个大气球那样升起——吸…呼…感觉到那个「圆」了吗？',
          ja: '起勢：足をゆっくり開いて、大きな玉を抱えるみたいに両手を上げる——吸って…吐いて…その「円」感じる？',
          en: 'Opening form: feet apart, raise your hands like you\'re holding a big balloon — in… out… can you feel the circle?',
        },
        move: 'taichi',
      },
      {
        cue: {
          yue: '雲手：腰帶住雙手，似抹雲咁由左轉右——左…右…左，越轉越順吖嘛？',
          zh: '云手：腰带着双手，像抹云那样由左转右——左…右…左，越转越顺了吧？',
          ja: '雲手：腰が両手を導くよ、雲をなでるみたいに左から右へ——左…右…左、どんどん滑らかになるでしょ？',
          en: 'Cloud hands: let your waist lead, stroking the clouds from left to right — left… right… left, getting smoother, right?',
        },
        move: 'taichi',
      },
      {
        cue: {
          yue: '金雞獨立：一隻手向前提起，一隻腳慢慢離地——似公雞咁企得穩，你得唔得？',
          zh: '金鸡独立：一只手向前提起，一只脚慢慢离地——像公鸡一样站得稳，你可以吗？',
          ja: '金鶏独立：片手を前に上げて、片足をゆっくり浮かせて——雄鶏みたいにしっかり立てる？',
          en: 'Golden rooster: raise one hand forward, lift one foot slowly — stand as steady as a rooster, can you?',
        },
        move: 'taichi',
      },
      {
        cue: {
          yue: '收勢：雙手慢慢向下按，氣沉丹田，靜心三秒——成個人鬆晒，舒服唔舒服？',
          zh: '收势：双手慢慢向下按，气沉丹田，静心三秒——整个人松了，舒不舒服？',
          ja: '収勢：両手をゆっくり下へ、気を丹田に沈めて、3秒静まる——全身がほぐれたね、気持ちいい？',
          en: 'Closing form: press both hands down slowly, sink the breath, three quiet seconds — all loosened up. Feel good?',
        },
        move: 'taichi',
      },
    ],
    done: {
      yue: '打完喇！太極就係要日日練——聽日再陪你打一趟好唔好？',
      zh: '打完啦！太极就是要天天练——明天再陪你打一趟好不好？',
      ja: '終わり！太極拳は毎日続けたらもっと気持ちいいよ——明日も一緒にやろう？',
      en: "That's the set! Tai chi rewards a little practice every day — shall we run through it again tomorrow?",
    },
    quit: {
      yue: '好，慢慢收功唔緊要——想再打嗰陣叫我吖？',
      zh: '好，慢慢收功不要紧——想再打的时候叫我呀？',
      ja: 'うん、途中でも大丈夫——またやりたくなったら呼んで？',
      en: 'Sure, ease out anytime — just call me when you want another round?',
    },
    startMove: 'taichi',
    hints: { relaxed: 0.85, joy: 0.15 },
  },
  // ---------------------------------------------------------------- kungfu
  kungfu: {
    kind: 'kungfu',
    start: {
      yue: '好！功夫堂開堂——先學禮貌，後學拳，跟住我，得唔得？',
      zh: '好！功夫课开讲——先学礼貌，后学拳，跟着我，行不行？',
      ja: 'よしっ、カンフーの時間！まず礼、次に拳、僕についてきて、いい？',
      en: 'Alright, kung fu class is in session — manners first, fists second. Follow me, okay?',
    },
    steps: [
      {
        cue: {
          yue: '第一式，抱拳禮：右手做拳，左手包拳，喺心口前一抱——見過師父！跟住做吖？',
          zh: '第一式，抱拳礼：右手做拳，左手包拳，在心口前一抱——见过师父！跟着做呀？',
          ja: '第一の型、抱拳礼：右手を拳に、左手で包んで、胸の前へ——師匠にご挨拶！一緒にやって？',
          en: 'Form one, the salute: right hand a fist, left hand wrapping it, to your heart — greet your master! Try it with me?',
        },
        move: 'kungfu',
      },
      {
        cue: {
          yue: '第二式，馬步：雙腳開大步，慢慢蹲低，腰板挺直——頂住十秒！仲頂唔頂到？',
          zh: '第二式，马步：双脚开大步，慢慢蹲低，腰板挺直——顶住十秒！还顶得住吗？',
          ja: '第二の型、馬歩：足を大きく開いて、ゆっくり腰を落として、背筋を伸ばして——10秒キープ！まだいける？',
          en: 'Form two, horse stance: wide stance, sink down slow, back straight — hold for ten! Still holding?',
        },
        move: 'kungfu',
      },
      {
        cue: {
          yue: '第三式，沖拳！右拳向前擊出，收返腰側，再換左拳——嘿！哈！有冇 feel 到力量？',
          zh: '第三式，冲拳！右拳向前击出，收回腰侧，再换左拳——嘿！哈！有没有感觉到力量？',
          ja: '第三の型、突き！右拳を前に打って、腰の横に戻して、次は左——ヘイ！ハッ！力感じる？',
          en: 'Form three, punches! Right fist out, back to your hip, then left — hey! ha! Feeling the power?',
        },
        move: 'kungfu',
      },
      {
        cue: {
          yue: '最後，格擋收尾：前臂向上向外一擋，再慢慢收勢——好喇，小徒弟，仲想唔想學多啲？',
          zh: '最后，格挡收尾：前臂向上向外一挡，再慢慢收势——好啦，小徒弟，还想不想多学点？',
          ja: '最後は受けで仕上げ：前腕で上から外へ受けて、ゆっくり収勢——よし、小さな弟子、もっと学びたい？',
          en: 'Finally, the block: forearm sweeps up and out, then settle back — great work, little apprentice, want to learn more?',
        },
        move: 'kungfu',
      },
    ],
    done: {
      yue: '今日嘅功夫堂完滿結束——你拳風好勁㗎！聽日繼續練好唔好？',
      zh: '今天的功夫课圆满结束——你的拳风好厉害！明天继续练好不好？',
      ja: '今日のカンフー教室、完璧な締めくくり——君の拳、すごくいい感じ！明日も続けよう？',
      en: "That's a wrap on today's kung fu class — your form is fierce! Keep training with me tomorrow?",
    },
    quit: {
      yue: '好，休息一下先！練功夫最緊要持之以恆——下次繼續好唔好？',
      zh: '好，先休息一下！练功夫最要紧持之以恒——下次继续好不好？',
      ja: 'うん、まず休憩！カンフーは続けるのが大事——次に続きをやろう？',
      en: 'Sure, rest up! Kung fu is all about consistency — continue next time?',
    },
    startMove: 'kungfu',
    hints: { joy: 0.65, surprise: 0.1 },
  },
  // ---------------------------------------------------------------- warmup
  warmup: {
    kind: 'warmup',
    start: {
      yue: '熱身時間到！由頭到腳郁動晒，跟住我，一齊嚟好唔好？',
      zh: '热身时间到！从头到脚都动起来，跟着我，一起来好不好？',
      ja: 'ウォーミングアップの時間！頭からつま先まで全身動かそう、一緒にやろう？',
      en: "Warm-up time! Let's move head to toe — follow me, shall we?",
    },
    steps: [
      {
        cue: {
          yue: '先鬆頸：頸慢慢向右畫五個大圈，再向左五個——邊數邊轉：一、二、三…鬆咗未？',
          zh: '先松脖子：脖子慢慢向右画五个大圈，再向左五个——边数边转：一、二、三…松了吗？',
          ja: 'まず首をほぐすよ：首をゆっくり右に5回大きく回して、次は左へ——数えながら：いち、に、さん…ほぐれた？',
          en: 'Loosen the neck first: five slow big circles to the right, then five to the left — count along: one, two, three… looser already?',
        },
        move: 'stretch',
      },
      {
        cue: {
          yue: '跟住雙手畫大圈：向前十下，再向後十下——似風車咁轉，跟唔跟到？',
          zh: '接着双手画大圈：向前十下，再向后十下——像风车一样转，跟不跟得上？',
          ja: '次は両手で大きく丸を描こう：前に10回、後ろに10回——風車みたいに回って、ついてこれる？',
          en: 'Now big arm circles: ten forward, ten back — spin like a windmill, keeping up?',
        },
        move: 'stretch',
      },
      {
        cue: {
          yue: '側腰伸展：雙手舉高，向左彎…返中間…向右彎——拉到側腰先算，正唔正？',
          zh: '侧腰伸展：双手举高，向左弯…回中间…向右弯——拉到侧腰才算数，对不对？',
          ja: '脇腹のストレッチ：両手を上げて、左へ屈んで…真ん中…右へ——脇腹が伸びるのを感じて、いい感じ？',
          en: 'Side stretches: arms up, lean left… back to center… lean right — feel the stretch in your side, nice right?',
        },
        move: 'stretch',
      },
      {
        cue: {
          yue: '最後輕輕跳：手腳一齊郁，跳十下——預備，跳！開唔開心？',
          zh: '最后轻轻跳：手脚一起动，跳十下——预备，跳！开不开心？',
          ja: '最後は軽くジャンプ：手足を動かして10回——よーい、ジャンプ！楽しい？',
          en: 'Finish with a light bounce: arms and legs together, ten hops — ready, jump! Having fun yet?',
        },
        move: 'jump',
      },
    ],
    done: {
      yue: '熱身完成！成個人醒晒神——想開始做運動定飲杯水先？',
      zh: '热身完成！整个人神清气爽——想开始运动还是先喝杯水？',
      ja: 'ウォーミングアップ完了！すっきり目が覚めたね——運動を始める？それとも水飲んで一息？',
      en: 'Warm-up complete! Wide awake now — ready to exercise, or grab some water first?',
    },
    quit: {
      yue: '好，慢慢唞！想郁動嗰陣隨時搵我，好唔好？',
      zh: '好，慢慢歇！想动动的时候随时找我，好不好？',
      ja: 'うん、ゆっくり休んで！動きたくなったらいつでも呼んで、ね？',
      en: 'Sure, take it easy! Come find me anytime you feel like moving, okay?',
    },
    startMove: 'stretch',
    hints: { joy: 0.7, relaxed: 0.3 },
  },
};

/** begin a lesson: the intro line, a fresh step cursor, and the demo move */
export function startExercise(kind: ExerciseKind, lang: ExLang): ExerciseTurn {
  const r = ROUTINES[kind];
  return {
    line: r.start[lang] ?? r.start.en,
    state: { kind, step: 0 },
    move: r.startMove,
    hints: r.hints,
  };
}

/** deliver the next step cue; once the routine is spent, close it out */
export function advanceExercise(state: ExerciseState, lang: ExLang): ExerciseTurn {
  const r = ROUTINES[state.kind];
  if (state.step >= r.steps.length) {
    return {
      line: r.done[lang] ?? r.done.en,
      state: null,
      move: r.steps[r.steps.length - 1]!.move,
      hints: r.hints,
    };
  }
  const step = r.steps[state.step]!;
  return {
    line: step.cue[lang] ?? step.cue.en,
    state: { kind: state.kind, step: state.step + 1 },
    move: step.move,
    hints: r.hints,
  };
}

/** the line she says when the user bails out mid-routine */
export function exerciseFarewellLine(kind: ExerciseKind, lang: ExLang): string {
  const r = ROUTINES[kind];
  return r.quit[lang] ?? r.quit.en;
}
