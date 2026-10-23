// Canned bubbles and exit lines. No LLM during a round.

import type { Lang } from '../prefs';
import type { HostPlatform } from './platform';
import type { ActionGame, MiniEmotionKind } from './types';

const LINES: Record<MiniEmotionKind, Record<Lang, string>> = {
  near_miss: {
    yue: '差少少！嘻嘻～',
    zh: '差一点点！嘻嘻～',
    ja: '惜しい！えへへ～',
    en: 'Almost! Hehe~',
  },
  catch: {
    yue: '俾你捉到喇！好啦，你贏咗——再嚟一次？',
    zh: '被你抓到啦！好啦，你赢了——再来一次？',
    ja: '捕まっちゃった！わかった、君の勝ち——もう一回？',
    en: 'You caught me! Okay, you win — again?',
  },
  timeout: {
    yue: '時間到～我走甩咗！想再捉我？',
    zh: '时间到～我溜走啦！想再抓我？',
    ja: '時間切れ～逃げ切った！もう一回追う？',
    en: "Time's up~ I got away! Want another try?",
  },
  lane_near_miss: {
    yue: '嘩，好險呀！',
    zh: '哇，好险呀！',
    ja: 'ひゃっ、危なかった！',
    en: 'Whoa, that was close!',
  },
  crash: {
    yue: '哎呀撞到喇…嘟嘴。再嚟？',
    zh: '哎呀撞到了…嘟嘴。再来？',
    ja: 'いたっ、ぶつかった…ぷんぷん。もう一回？',
    en: 'Oof, I bumped it… pout. Again?',
  },
  survive: {
    yue: '撐到尾喇！我就知我哋避得到——再跑一轉？',
    zh: '撑到最后啦！我就知道我们躲得过——再跑一趟？',
    ja: 'やりきった！全部よけられたね——もう一周？',
    en: 'We made it! I knew we could dodge all of that — one more run?',
  },
  quit: {
    yue: '好呀，返去傾偈。遲啲再捉我吖？',
    zh: '好呀，回去聊天。等下再来抓我呀？',
    ja: 'うん、おしゃべりに戻ろ。またあとで捕まえて？',
    en: 'Okay, back to chatting. Catch me again later?',
  },
};

export function lineFor(kind: MiniEmotionKind, lang: Lang): string {
  return LINES[kind][lang] ?? LINES[kind].en;
}

export interface MiniUiCopy {
  again: string;
  back: string;
  close: string;
  tagHint: string;
  laneHint: string;
  tagTitle: string;
  laneTitle: string;
  /** Word on the title-screen button. Kept as START in every language. */
  start: string;
  score: string;
  menu: string;
}

const UI: Record<Lang, MiniUiCopy> = {
  yue: {
    again: '再嚟',
    back: '返去傾偈',
    close: '離開',
    tagHint: '按住跑向手指 · 輕點衝刺',
    laneHint: '左右掃 · A/D 或方向鍵 · 撳左中右',
    tagTitle: '捕まえて！',
    laneTitle: '逃げて！',
    start: 'START',
    score: '分數',
    menu: '小遊戲',
  },
  zh: {
    again: '再来',
    back: '返回聊天',
    close: '离开',
    tagHint: '按住跑向手指 · 轻点冲刺',
    laneHint: '左右滑 · A/D 或方向键 · 点左中右',
    tagTitle: '捕まえて！',
    laneTitle: '逃げて！',
    start: 'START',
    score: '分数',
    menu: '小游戏',
  },
  ja: {
    again: 'もう一回',
    back: 'チャットに戻る',
    close: 'やめる',
    tagHint: '長押しで走る · タップでダッシュ',
    laneHint: 'スワイプ · A/D か矢印 · 画面を三分割タップ',
    tagTitle: '捕まえて！',
    laneTitle: '逃げて！',
    start: 'START',
    score: 'スコア',
    menu: 'ミニゲーム',
  },
  en: {
    again: 'Again',
    back: 'Back to chat',
    close: 'Leave',
    tagHint: 'Hold to run toward the pointer · tap to dash',
    laneHint: 'Swipe · A/D or arrows · click a third',
    tagTitle: '捕まえて！',
    laneTitle: '逃げて！',
    start: 'START',
    score: 'Score',
    menu: 'Mini-games',
  },
};

export function uiCopy(lang: Lang): MiniUiCopy {
  return UI[lang] ?? UI.en;
}

const CONTROL: Record<HostPlatform, Record<ActionGame, Record<Lang, string>>> = {
  desktop: {
    tag: {
      yue: 'PC：WASD 或方向鍵追逐 · 點擊衝刺',
      zh: 'PC：WASD 或方向键追逐 · 点击冲刺',
      ja: 'PC：WASD か矢印で追う · クリックでダッシュ',
      en: 'PC: WASD or arrows to chase · click to dash',
    },
    lane: {
      yue: 'PC：A/D 或方向鍵',
      zh: 'PC：A/D 或方向键',
      ja: 'PC：A/D か矢印キー',
      en: 'PC: A/D or arrow keys',
    },
  },
  ios: {
    tag: {
      yue: '按住追逐 · 輕點衝刺',
      zh: '按住追逐 · 轻点冲刺',
      ja: '長押しで追う · タップでダッシュ',
      en: 'Hold to chase · tap to dash',
    },
    lane: {
      yue: '左右掃',
      zh: '左右滑',
      ja: '左右にスワイプ',
      en: 'Swipe left/right',
    },
  },
  android: {
    tag: {
      yue: '按住追逐 · 輕點衝刺',
      zh: '按住追逐 · 轻点冲刺',
      ja: '長押しで追う · タップでダッシュ',
      en: 'Hold to chase · tap to dash',
    },
    lane: {
      yue: '左右掃',
      zh: '左右滑',
      ja: '左右にスワイプ',
      en: 'Swipe left/right',
    },
  },
};

/** One short line under START. The howto graphic stays the same on every host. */
export function controlHint(kind: ActionGame, platform: HostPlatform, lang: Lang): string {
  const table = CONTROL[platform] ?? CONTROL.desktop;
  const row = table[kind];
  return row[lang] ?? row.en;
}
