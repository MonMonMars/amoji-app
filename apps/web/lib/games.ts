// r2026-10-04.42: deterministic mini-game engine — rock-paper-scissors,
// guess-the-number, dice. LLM-free so games are instant, fair and work even
// when the brain is slow; every spoken line ends with a question or an
// invitation so the conversation never stalls (continuity rule).

export type GameKind = 'rps' | 'guess' | 'dice';
export type Lang = 'yue' | 'zh' | 'ja' | 'en';
export type Rng = () => number;

export interface GameState {
  kind: GameKind;
  target: number; // guess-the-number answer
  lo: number; // guess-the-number current window
  hi: number;
  userScore: number;
  botScore: number;
  rounds: number;
  maxRounds: number;
}

export interface TurnResult {
  line: string;
  state: GameState;
  ended: boolean;
  move?: 'jump';
}

const RPS_RE = /(猜拳|剪刀石頭布|石头剪刀布|包剪揼|rock.?paper.?scissors|じゃんけん)/i;
const GUESS_RE = /(猜數字|猜数字|估數字|估数字|guess the number|数あて)/i;
const DICE_RE = /(擲骰|掷骰|骰仔|擲色|掷色|骰子|dice|サイコロ)/i;
const STOP_RE = /(唔玩|不玩|退出遊戲|退出游戏|stop the game|quit game|やめ)/i;

/** returns the game to start, 'stop' to end one, or undefined for normal chat */
export function detectGame(text: string): GameKind | 'stop' | undefined {
  if (STOP_RE.test(text)) return 'stop';
  if (RPS_RE.test(text)) return 'rps';
  if (GUESS_RE.test(text)) return 'guess';
  if (DICE_RE.test(text)) return 'dice';
  return undefined;
}

const RPS_WORDS: Record<Lang, string[]> = {
  yue: ['石頭', '布', '剪刀'],
  zh: ['石头', '布', '剪刀'],
  ja: ['グー', 'パー', 'チョキ'],
  en: ['rock', 'paper', 'scissors'],
};

const RPS_START: Record<Lang, string> = {
  yue: '嚟緊猜拳！五局三勝㗎——你出咩先？石頭、布定剪刀？',
  zh: '来猜拳！五局三胜——你先出什么？石头、布还是剪刀？',
  ja: 'じゃんけん勝負！五回戦だよ——最初は何？グー、パー、チョキ？',
  en: 'Rock paper scissors! Best of five — what do you throw first? Rock, paper, or scissors?',
};

const RPS_PROMPT: Record<Lang, string> = {
  yue: '我睇唔明吖～講「石頭」、「布」或者「剪刀」，再嚟一次？',
  zh: '我没看懂呀～说「石头」、「布」或者「剪刀」，再来一次？',
  ja: 'よくわかんなかった〜「グー」「パー」「チョキ」って言って？',
  en: 'Hmm, I didn\'t catch that — say "rock", "paper", or "scissors"?',
};

const RPS_WIN: Record<Lang, string> = {
  yue: '你出{uw}，我出{bw}——呢局你贏！{u} 比 {b}，繼續？',
  zh: '你出{uw}，我出{bw}——这局你赢！{u} 比 {b}，继续？',
  ja: '君は{uw}、僕は{bw}——この勝負は君の勝ち！{u}対{b}、続ける？',
  en: 'You threw {uw}, I threw {bw} — you win this one! {u} to {b}, go again?',
};

const RPS_LOSE: Record<Lang, string> = {
  yue: '你出{uw}，我出{bw}——呢局我贏咗，嘿嘿！{u} 比 {b}，想反擊未？',
  zh: '你出{uw}，我出{bw}——这局我赢啦，嘿嘿！{u} 比 {b}，想反击吗？',
  ja: '君は{uw}、僕は{bw}——この勝負は僕の勝ち、えへへ！{u}対{b}、逆襲する？',
  en: 'You threw {uw}, I threw {bw} — I take this one, hehe! {u} to {b}, want revenge?',
};

const RPS_DRAW: Record<Lang, string> = {
  yue: '大家都出{uw}！平手～{u} 比 {b}，再嚟？',
  zh: '大家都出{uw}！平局～{u} 比 {b}，再来？',
  ja: 'お互い{uw}！引き分け〜{u}対{b}、もう一度？',
  en: 'We\'re both on {uw}! A draw~ {u} to {b}, once more?',
};

const END_WIN: Record<Lang, string> = {
  yue: '打完啦！你贏咗 {u} 比 {b}——你犀利呀！玩唔玩第二樣？',
  zh: '打完啦！你赢了 {u} 比 {b}——好厉害！要不要再玩别的？',
  ja: '終了！君の勝ち {u}対{b}——すごいね！次は別の遊び？',
  en: 'That\'s the game! You win {u} to {b} — amazing! Fancy another round of something else?',
};

const END_LOSE: Record<Lang, string> = {
  yue: '打完啦！我贏 {b} 比 {u}——唔緊要，我讓返你先！再挑戰我？',
  zh: '打完啦！我赢 {b} 比 {u}——不要紧，我让你先！要不要再挑战我？',
  ja: '終了！僕の勝ち {b}対{u}——大丈夫、次は先手をあげる！もう一回挑戦する？',
  en: 'That\'s the game! I win {b} to {u} — no worries, you can go first next time! Rematch?',
};

const END_DRAW: Record<Lang, string> = {
  yue: '打和！{u} 比 {b}——咁有默契！加時賽定食嘢先？',
  zh: '打平！{u} 比 {b}——好有默契！加时赛还是先吃点东西？',
  ja: '引き分け！{u}対{b}——息ぴったり！延長戦か、ごはんにする？',
  en: 'A tie! {u} to {b} — we\'re so in sync! Sudden death, or snacks first?',
};

const GUESS_START: Record<Lang, string> = {
  yue: '好呀，我諗好咗一個 1 到 20 嘅數——快啲估下係幾多？',
  zh: '好呀，我想好了一个 1 到 20 的数字——快猜猜是多少？',
  ja: 'うん、1から20の数字を思いついたよ——さあ、いくつでしょう？',
  en: 'Okay, I picked a number from 1 to 20 — what do you guess?',
};

const GUESS_PROMPT: Record<Lang, string> = {
  yue: '係數字嚟㗎！1 到 20 之間，再估一次？',
  zh: '是数字哦！1 到 20 之间，再猜一次？',
  ja: '数字だよ！1から20の間、もう一回？',
  en: 'A number, silly! Between 1 and 20 — try again?',
};

const GUESS_LOW: Record<Lang, string> = {
  yue: '細咗！大過 {n}——仲有 {lo} 到 {hi}，再嚟？',
  zh: '小了！比 {n} 大——还有 {lo} 到 {hi}，再来？',
  ja: '小さいよ！{n}より大きい——あと{lo}から{hi}、もう一回？',
  en: 'Too low! Bigger than {n} — somewhere between {lo} and {hi}, go again?',
};

const GUESS_HIGH: Record<Lang, string> = {
  yue: '大咗！細過 {n}——仲有 {lo} 到 {hi}，快啲再估？',
  zh: '大了！比 {n} 小——还有 {lo} 到 {hi}，快再猜猜？',
  ja: '大きいよ！{n}より小さい——あと{lo}から{hi}、もう一回？',
  en: 'Too high! Smaller than {n} — between {lo} and {hi}, guess again?',
};

const GUESS_HIT: Record<Lang, string> = {
  yue: '中咗！我就係諗緊 {t}——你識讀心呀？玩唔玩勁啲嘅？',
  zh: '中了！我想的就是 {t}——你会读心术吗？要不要玩点更难的？',
  ja: '当たり！{t}だよ——心が読めるの？もっと難しいのにする？',
  en: 'You got it! I was thinking of {t} — are you psychic? Want a harder one?',
};

const GUESS_GIVEUP: Record<Lang, string> = {
  yue: '十次都估唔中，我諗緊嘅係 {t}——下次一定掂！想再玩未？',
  zh: '十次都没猜中，我想的是 {t}——下次一定行！想再玩吗？',
  ja: '十回外しちゃった、答えは{t}だったよ——次こそ当てて？もう一回？',
  en: 'Ten guesses and no luck — it was {t}! You\'ll get it next time, want to go again?',
};

const DICE_START: Record<Lang, string> = {
  yue: '擲骰大戰！三局兩勝——準備好未？講「擲」就開波？',
  zh: '掷骰大战！三局两胜——准备好了吗？说「掷」就开始？',
  ja: 'サイコロ対決！三回勝負——準備OK？「よし」って言って？',
  en: 'Dice battle! Best of three — ready? Say "roll" and we go?',
};

const DICE_WIN: Record<Lang, string> = {
  yue: '你擲到 {ur}，我擲到 {br}——你贏！{u} 比 {b}，繼續？',
  zh: '你掷到 {ur}，我掷到 {br}——你赢！{u} 比 {b}，继续？',
  ja: '君は{ur}、僕は{br}——君の勝ち！{u}対{b}、続ける？',
  en: 'You rolled {ur}, I rolled {br} — you win! {u} to {b}, keep going?',
};

const DICE_LOSE: Record<Lang, string> = {
  yue: '你擲到 {ur}，我擲到 {br}——呢局我贏，嘻嘻！{u} 比 {b}，反擊？',
  zh: '你掷到 {ur}，我掷到 {br}——这局我赢，嘻嘻！{u} 比 {b}，反击？',
  ja: '君は{ur}、僕は{br}——この局は僕、うふふ！{u}対{b}、逆襲？',
  en: 'You rolled {ur}, I rolled {br} — this one\'s mine, teehee! {u} to {b}, fight back?',
};

const DICE_DRAW: Record<Lang, string> = {
  yue: '大家都擲到 {ur}！平手～{u} 比 {b}，再擲過？',
  zh: '大家都掷到 {ur}！平局～{u} 比 {b}，再掷一次？',
  ja: 'お互い{ur}！引き分け〜{u}対{b}、もう一回？',
  en: 'We both rolled {ur}! A draw~ {u} to {b}, roll again?',
};

const FAREWELL: Record<Lang, string> = {
  yue: '好呀，唔玩住！今日玩得好開心，下次再嚟挑戰我吖？',
  zh: '好呀，先不玩啦！今天玩得好开心，下次再来挑战我呀？',
  ja: 'うん、今日はここまで！楽しかったね、また挑戦しにきて？',
  en: 'Sure, we can stop! That was fun — come challenge me again soon?',
};

function fmt(tpl: string, vars: Record<string, number | string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''));
}

/** begin a fresh game of `kind` and get the opening line + initial state */
export function startGame(kind: GameKind, lang: Lang, rng: Rng = Math.random): { line: string; state: GameState } {
  if (kind === 'rps') {
    return {
      line: RPS_START[lang] ?? RPS_START.en,
      state: { kind, target: 0, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 0, maxRounds: 5 },
    };
  }
  if (kind === 'dice') {
    return {
      line: DICE_START[lang] ?? DICE_START.en,
      state: { kind, target: 0, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 0, maxRounds: 3 },
    };
  }
  return {
    line: GUESS_START[lang] ?? GUESS_START.en,
    state: { kind, target: 1 + Math.floor(rng() * 20), lo: 1, hi: 20, userScore: 0, botScore: 0, rounds: 0, maxRounds: 10 },
  };
}

function scoreEnd(state: GameState, lang: Lang, vars: Record<string, number | string>): { line: string; ended: true } {
  if (state.userScore > state.botScore) return { line: fmt(END_WIN[lang] ?? END_WIN.en, vars), ended: true };
  if (state.userScore < state.botScore) return { line: fmt(END_LOSE[lang] ?? END_LOSE.en, vars), ended: true };
  return { line: fmt(END_DRAW[lang] ?? END_DRAW.en, vars), ended: true };
}

function rpsTurn(state: GameState, text: string, lang: Lang, rng: Rng): TurnResult {
  const words = RPS_WORDS[lang] ?? RPS_WORDS.en;
  const t = lang === 'en' ? text.toLowerCase() : text;
  let u = -1;
  for (let i = 0; i < words.length; i++) {
    if (t.includes(words[i]!.toLowerCase())) {
      u = i;
      break;
    }
  }
  if (u < 0) return { line: RPS_PROMPT[lang] ?? RPS_PROMPT.en, state, ended: false };
  const b = Math.floor(rng() * 3);
  const rounds = state.rounds + 1;
  const diff = (u - b + 3) % 3; // 1 = user win, 2 = bot win, 0 = draw
  const userScore = state.userScore + (diff === 1 ? 1 : 0);
  const botScore = state.botScore + (diff === 2 ? 1 : 0);
  const ns: GameState = { ...state, userScore, botScore, rounds };
  const vars = { u: userScore, b: botScore, uw: words[u]!, bw: words[b]! };
  if (rounds >= state.maxRounds) {
    const end = scoreEnd(ns, lang, vars);
    return { line: end.line, state: ns, ended: true, move: userScore > botScore ? 'jump' : undefined };
  }
  const tpl = diff === 1 ? RPS_WIN[lang] : diff === 2 ? RPS_LOSE[lang] : RPS_DRAW[lang];
  return { line: fmt(tpl ?? RPS_DRAW.en!, vars), state: ns, ended: false, move: diff === 1 ? 'jump' : undefined };
}

function guessTurn(state: GameState, text: string, lang: Lang): TurnResult {
  const m = text.match(/\d+/);
  if (!m) return { line: GUESS_PROMPT[lang] ?? GUESS_PROMPT.en, state, ended: false };
  const n = parseInt(m[0], 10);
  const rounds = state.rounds + 1;
  if (n === state.target) {
    return {
      line: fmt(GUESS_HIT[lang] ?? GUESS_HIT.en, { t: state.target }),
      state: { ...state, rounds },
      ended: true,
      move: 'jump',
    };
  }
  const lo = n < state.target ? Math.max(state.lo, n + 1) : state.lo;
  const hi = n > state.target ? Math.min(state.hi, n - 1) : state.hi;
  const ns: GameState = { ...state, lo, hi, rounds };
  if (rounds >= state.maxRounds) {
    return { line: fmt(GUESS_GIVEUP[lang] ?? GUESS_GIVEUP.en, { t: state.target }), state: ns, ended: true };
  }
  const tpl = n < state.target ? GUESS_LOW[lang] : GUESS_HIGH[lang];
  return { line: fmt(tpl ?? GUESS_HIGH.en!, { n, lo, hi }), state: ns, ended: false };
}

function diceTurn(state: GameState, _text: string, lang: Lang, rng: Rng): TurnResult {
  const ur = 1 + Math.floor(rng() * 6);
  const br = 1 + Math.floor(rng() * 6);
  const rounds = state.rounds + 1;
  const userScore = state.userScore + (ur > br ? 1 : 0);
  const botScore = state.botScore + (br > ur ? 1 : 0);
  const ns: GameState = { ...state, userScore, botScore, rounds };
  const vars = { u: userScore, b: botScore, ur, br };
  if (rounds >= state.maxRounds) {
    const end = scoreEnd(ns, lang, vars);
    return { line: end.line, state: ns, ended: true, move: userScore > botScore ? 'jump' : undefined };
  }
  const tpl = ur > br ? DICE_WIN[lang] : br > ur ? DICE_LOSE[lang] : DICE_DRAW[lang];
  return { line: fmt(tpl ?? DICE_DRAW.en!, vars), state: ns, ended: false, move: ur > br ? 'jump' : undefined };
}

/** advance the active game by one user message */
export function playTurn(state: GameState, text: string, lang: Lang, rng: Rng = Math.random): TurnResult {
  if (state.kind === 'rps') return rpsTurn(state, text, lang, rng);
  if (state.kind === 'dice') return diceTurn(state, text, lang, rng);
  return guessTurn(state, text, lang);
}

/** the line she says when the user calls it quits mid-game */
export function gameFarewellLine(lang: Lang): string {
  return FAREWELL[lang] ?? FAREWELL.en;
}
