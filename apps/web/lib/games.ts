// r2026-10-04.42: deterministic mini-game engine — rock-paper-scissors,
// guess-the-number, dice. LLM-free so games are instant, fair and work even
// when the brain is slow; every spoken line ends with a question or an
// invitation so the conversation never stalls (continuity rule).
// r2026-10-04.43: four more, from the Japanese companion-game playbook —
// shiritori/接龍 word chain (with the classic ん rule), omikuji shrine
// fortune (one draw per visit), which-hand (she hides a treat), and
// high-low card. Same deal: LLM-free, instant, every line invites the
// next turn.
// r2026-10-04.44: hotfix — guess-the-number startGame branch fell through
// to the hilo default (r43 CI red), and 'higher or lower' missed HILO_RE.

export type GameKind = 'rps' | 'guess' | 'dice' | 'wordchain' | 'omikuji' | 'hands' | 'hilo';
export type Lang = 'yue' | 'zh' | 'ja' | 'en';
export type Rng = () => number;

export interface GameState {
  kind: GameKind;
  target: number; // guess-the-number answer / omikuji tier index
  lo: number; // guess-the-number current window
  hi: number;
  userScore: number; // hilo: current streak
  botScore: number;
  rounds: number;
  maxRounds: number;
  /** wordchain: the word on the table · hilo: the current card */
  lastWord?: string;
  /** wordchain: how many times the user failed to follow */
  fails?: number;
  /** hilo: current card value 1-13 */
  card?: number;
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
const WORDCHAIN_RE = /(接龍|接龙|字尾接|しりとり|shiritori|word chain)/i;
const OMIKUJI_RE = /(求籤|求签|抽籤|抽签|神籤|御神籤|運勢|运势|占い|うらない|占卜|占一卦|算一卦|omikuji|draw my fortune|tell my fortune|my fortune)/i;
const HANDS_RE = /(猜手|哪隻手|哪只手|邊隻手|边只手|左手定右手|估我隻手|which hand|guess the hand)/i;
const HILO_RE = /(大細牌|比大小|high.?low|higher or lower|大きい小さい)/i;
const STOP_RE = /(唔玩|不玩|退出遊戲|退出游戏|stop the game|quit game|やめ)/i;

/** returns the game to start, 'stop' to end one, or undefined for normal chat */
export function detectGame(text: string): GameKind | 'stop' | undefined {
  if (STOP_RE.test(text)) return 'stop';
  if (WORDCHAIN_RE.test(text)) return 'wordchain';
  if (OMIKUJI_RE.test(text)) return 'omikuji';
  if (HANDS_RE.test(text)) return 'hands';
  if (HILO_RE.test(text)) return 'hilo';
  if (RPS_RE.test(text)) return 'rps';
  if (GUESS_RE.test(text)) return 'guess';
  if (DICE_RE.test(text)) return 'dice';
  return undefined;
}

// ---------------------------------------------------------------- word chain

const WC_STARTER: Record<Lang, string> = { yue: '蘋果', zh: '苹果', ja: 'さくら', en: 'star' };

/** her word bank per language, keyed by the FIRST character/letter/kana.
 *  Deliberately cute everyday nouns — she plays gentle, not competitive. */
const WORD_BANK: Record<Lang, Record<string, string[]>> = {
  yue: {
    果: ['果汁', '果醬'], 汁: ['汁水'], 花: ['花貓', '花園'], 貓: ['貓仔'], 狗: ['狗仔'],
    星: ['星空'], 園: ['園丁'], 丁: ['丁點'], 空: ['空氣'], 氣: ['氣球'],
    月: ['月光', '月餅'], 光: ['光明'], 餅: ['餅乾'], 明: ['明白'], 白: ['白糖'],
    海: ['海邊', '海豚'], 邊: ['邊爐'], 豚: ['豚肉'], 肉: ['肉包'], 包: ['包點'],
    山: ['山水', '山竹'], 竹: ['竹筍'], 心: ['心口', '心形'], 形: ['形狀'], 狀: ['狀元'],
    夢: ['夢想'], 想: ['想念'], 念: ['念珠'], 雨: ['雨傘', '雨衣'], 傘: ['傘子'],
    衣: ['衣服'], 服: ['服裝'], 裝: ['裝飾'], 飾: ['飾物'], 物: ['物品'], 品: ['品茶'],
    雪: ['雪糕', '雪人'], 糕: ['糕點'], 人: ['人口'], 口: ['口水'], 水: ['水仙'],
    糖: ['糖果'], 茶: ['茶杯'], 杯: ['杯麵'], 麵: ['麵粉'], 粉: ['粉色'], 色: ['色彩'],
    彩: ['彩虹'], 虹: ['虹橋'], 橋: ['橋頭'], 頭: ['頭髮'], 髮: ['髮型'], 迷: ['迷路'],
    路: ['路口'], 仙: ['仙女'], 女: ['女皇'], 皇: ['皇冠'], 冠: ['冠軍'], 軍: ['軍裝'],
    元: ['元旦'], 旦: ['旦角'], 珠: ['珠江'], 江: ['江河'], 河: ['河山'],
  },
  zh: {
    果: ['果汁', '果酱'], 汁: ['汁水'], 花: ['花园', '花生'], 生: ['生日', '生气'], 气: ['气球'],
    球: ['球鞋'], 鞋: ['鞋带'], 带: ['带领'], 领: ['领带'], 猫: ['猫眼'],
    星: ['星空'], 空: ['空气'], 月: ['月光', '月饼'], 饼: ['饼干'], 光: ['光明'],
    明: ['明天'], 天: ['天空'], 海: ['海边', '海豚'], 豚: ['豚肉'], 肉: ['肉包'], 包: ['包点'],
    山: ['山水', '山竹'], 竹: ['竹笋'], 心: ['心情', '心形'], 情: ['情节'], 形: ['形状'],
    状: ['状元'], 梦: ['梦想'], 想: ['想念'], 雨: ['雨伞', '雨衣'], 伞: ['伞子'],
    衣: ['衣服'], 服: ['服装'], 雪: ['雪糕', '雪人'], 人: ['人口', '人气'], 口: ['口水'],
    水: ['水果', '水仙'], 仙: ['仙女'], 糖: ['糖果'], 茶: ['茶杯'], 杯: ['杯子'],
    子: ['子孙'], 点: ['点心'], 迷: ['迷路'], 路: ['路口'], 彩: ['彩虹'], 虹: ['虹桥'],
    桥: ['桥头'], 头: ['头发'], 发: ['发型'], 型: ['型号'], 号: ['号码'], 草: ['草莓'], 莓: ['莓果'],
    干: ['干净'], 日: ['日历'],
  },
  ja: {
    あ: ['あめ', 'あし'], い: ['いぬ', 'いちご'], う: ['うさぎ', 'うみ'], か: ['かさ', 'かに'],
    き: ['きつね', 'きのこ'], く: ['くま', 'くも'], こ: ['こま', 'こども'], さ: ['さかな', 'さる'],
    し: ['しろくま', 'しま'], す: ['すいか'], た: ['たまご', 'たいやき'], と: ['とけい', 'とり'],
    な: ['なす', 'なみ'], の: ['のり'], は: ['はな', 'はと'], ひ: ['ひよこ', 'ひかり'],
    ま: ['まど', 'まくら'], み: ['みみ', 'みどり'], も: ['もり', 'もも'], や: ['やま'],
    ら: ['らっこ', 'らくご'], り: ['りんご', 'りす'], る: ['るり'], わ: ['わに'],
    ご: ['ごま'], ね: ['ねこ', 'ねずみ'], ど: ['どうぶつ', 'どんぐり'], つ: ['つばめ', 'つき'],
    め: ['めがね'], に: ['にわとり'], ぬ: ['ぬの'],
  },
  en: {
    a: ['apple', 'anchor'], b: ['banana', 'bird'], c: ['cat', 'cake'], d: ['dolphin', 'door'],
    e: ['elephant', 'egg'], f: ['flower', 'fish'], g: ['grape', 'guitar'], h: ['house', 'hat'],
    i: ['icecream', 'igloo'], j: ['jungle', 'juice'], k: ['kite', 'kangaroo'], l: ['lemon', 'ladder'],
    m: ['mango', 'moon'], n: ['night', 'nose'], o: ['orange', 'octopus'], p: ['penguin', 'piano'],
    q: ['queen', 'quilt'], r: ['rabbit', 'rainbow'], s: ['strawberry', 'sun'], t: ['tiger', 'table'],
    u: ['umbrella', 'unicorn'], v: ['violin', 'violet'], w: ['window', 'watermelon'], x: ['xylophone'],
    y: ['yellow', 'yogurt'], z: ['zebra', 'zoo'],
  },
};

const WC_START: Record<Lang, string> = {
  yue: '接龍時間！我開頭：「{word}」！你接個「{last}」字俾我吖？',
  zh: '接龙时间！我先来：「{word}」！你接一个「{last}」开头的词吧？',
  ja: 'しりとり！じゃあ最初は…「{word}」！「{last}」から始まる言葉、どうぞ？',
  en: 'Word chain! I\'ll start: "{word}" — give me a word starting with "{last}"?',
};

const WC_NEXT: Record<Lang, string> = {
  yue: '我接「{word}」！輪到你，接個「{last}」字？',
  zh: '我接「{word}」！轮到你，接个「{last}」开头的？',
  ja: 'じゃあ…「{word}」！次は「{last}」から、お願い？',
  en: 'Hmm… "{word}"! Your turn — something starting with "{last}"?',
};

const WC_MISS: Record<Lang, string> = {
  yue: '唔啱喎～要用「{last}」字開頭㗎！再嚟一次？',
  zh: '不对哦～要用「{last}」开头！再来一次？',
  ja: 'あれ、ちがうよ〜「{last}」から始まる言葉だよ？もう一度？',
  en: 'Oops — it has to start with "{last}"! Try again?',
};

const WC_SHE_WIN: Record<Lang, string> = {
  yue: '三振！哈哈我贏咗喇～唔緊要，下場讓你先！再挑戰我？',
  zh: '三次都没接上！哈哈我赢啦～没关系，下场让你先！再挑战我？',
  ja: '三振〜！えへへ、僕の勝ち！次は譲ってあげるよ、もう一回？',
  en: 'Strike three! Hehe, I win this one — I\'ll go easy next time. Rematch?',
};

const WC_USER_WIN: Record<Lang, string> = {
  yue: '哇！「{last}」字開頭…我接唔到！你贏咗！你腦筋真係快——再玩過？',
  zh: '哇！「{last}」开头…我接不上！你赢啦！反应好快——再来一局？',
  ja: 'わあっ「{last}」から始まる言葉…出てこない！君の勝ち！頭いいね——もう一回？',
  en: 'Wow, a word starting with "{last}"… I\'ve got nothing — you win! Sharp mind — one more round?',
};

const WC_N_END: Record<Lang, string> = {
  yue: '三振！哈哈我贏咗喇～唔緊要，下場讓你先！再挑戰我？',
  zh: '三次都没接上！哈哈我赢啦～没关系，下场让你先！再挑战我？',
  ja: '「ん」で終わっちゃった〜！それは僕の勝ち！ごめんごめん、もう一回？',
  en: 'Strike three! Hehe, I win this one — rematch?',
};

const WC_DRAW: Record<Lang, string> = {
  yue: '接咗咁多轉都未停！你真係勁——今日到此為止，聽日再嚟？',
  zh: '接了这么多还没停！好厉害——今天先到这，明天再来？',
  ja: 'こんなに続くなんてすごい！今日はここまで、また明日ね？',
  en: 'What a rally — neither of us would drop it! Let\'s call it here, same time tomorrow?',
};

// ------------------------------------------------------------------ omikuji

const OMIKUJI_LINES: Record<Lang, string[]> = {
  yue: [
    '嘩——大吉！今日你一定行運行到落腳！快啲許個願先？',
    '中吉呀！好事慢慢嚟，唔使急㗎——今日開心咩？',
    '小吉～平平稳稳，最緊要開心！想唔想聽多句吉言？',
    '吉！順順利利，出門遇貴人吖——你今日最想見邊個？',
    '末吉…時運未係最好，不過有我陪住你㗎！要唔要我唱首歌提提神？',
    '凶？唔使驚！抽多支就變大吉㗎喇——再抽一支好唔好？',
  ],
  zh: [
    '哇——大吉！你今天一定好运爆棚！快许个愿吧？',
    '中吉呀！好事慢慢来，开心最重要——今天想做什么呀？',
    '小吉～平平淡淡才是真！要不要听我多说两句吉祥话？',
    '吉！顺顺利利，出门遇贵人哦——你今天最想见到谁呀？',
    '末吉…运势还没到位，但有我陪着你呀！要不要我唱首歌给你打气？',
    '凶？别怕别怕！再抽一支肯定变大吉——要不要再抽一支？',
  ],
  ja: [
    'わあっ、大吉！今日の君はきっと万事うまくいくよ——ね、何お願いする？',
    '中吉だよ！いいことじゃんじゃん来るから、焦らなくていいんだ——今日何したい？',
    '小吉〜。コツコツが大事な日かな。よかったら私が励ましてあげよっか？',
    '吉！すこぶる順調だよ。お出かけすればいいことあるかも——どこ行きたい？',
    '末吉かぁ…ツイてない日でも、私は味方だよ！ね、歌でも歌って元気出す？',
    '凶！？…ご、ご安心を！もう一回引けば大吉に決まってる——引いちゃう？',
  ],
  en: [
    'Wow — GREAT blessing! Luck is totally on your side today — quick, make a wish?',
    'Good fortune! Nice things are on their way, no need to rush — so, happy today?',
    'A small blessing~ Slow and steady wins, and the point is to be happy! Want another pep talk?',
    'Lucky! Smooth sailing ahead — step outside and good things will find you. Who do you most want to see today?',
    'Hmm, fair fortune… luck is warming up, but hey, you\'ve always got me! Want me to sing you something upbeat?',
    'Uh oh, "try again"! No worries — one more draw and it\'ll be a GREAT blessing. Go again?',
  ],
};

const OMIKUJI_AGAIN: Record<Lang, string> = {
  yue: '籤呢家嘢一日一次最有靈驗㗎～聽日再抽好唔好？',
  zh: '求签一天一次最灵验啦～明天再抽好不好？',
  ja: 'おみくじは一日一回までが一番効くんだ〜明日また引こう？',
  en: 'One draw a day keeps the luck at play~ come back tomorrow for another?',
};

// ---------------------------------------------------------------- which hand

const HANDS_START: Record<Lang, string> = {
  yue: '我袋住粒糖喺其中一隻手！估下係左、右定中間？三局兩勝㗎！',
  zh: '我藏了一颗糖在一只手里！猜是左、右还是中间？三局两胜哦！',
  ja: 'お菓子をどっちかの手に握ってるよ！左？右？真ん中？三回勝負だよ！',
  en: 'I\'m hiding a candy in one hand! Left, right, or middle? Best of three!',
};

const HANDS_PROMPT: Record<Lang, string> = {
  yue: '講「左」、「右」或者「中間」吖～再嚟一次？',
  zh: '说「左」、「右」或者「中间」呀～再来一次？',
  ja: '「左」「右」「真ん中」って言って？もう一回！',
  en: 'Say "left", "right", or "middle" — try again?',
};

const HANDS_WIN: Record<Lang, string> = {
  yue: '你估中咗！係{hand}！唔係啩——你識讀心㗎？{u} 比 {b}，再嚟？',
  zh: '你猜中了！在{hand}！不是吧——你会读心术呀？{u} 比 {b}，再来？',
  ja: '当たり！{hand}だよ！えっ——心読めるの！？{u}対{b}、もう一回？',
  en: 'You got it — {hand}! No way, are you psychic? {u} to {b}, again?',
};

const HANDS_LOSE: Record<Lang, string> = {
  yue: '哈哈係{hand}！摸唔到吖～{u} 比 {b}，想反敗為勝？',
  zh: '哈哈在{hand}！没摸到吧～{u} 比 {b}，想反败为胜？',
  ja: 'あはは、{hand}！残念〜{u}対{b}、逆転する？',
  en: 'Haha, it was {hand}! So close~ {u} to {b}, want to turn it around?',
};

const HAND_NAME: Record<Lang, string[]> = {
  yue: ['左手', '右手', '中間'],
  zh: ['左手', '右手', '中间'],
  ja: ['左手', '右手', '真ん中'],
  en: ['left hand', 'right hand', 'the middle'],
};

// -------------------------------------------------------------------- hi-lo

const HILO_START: Record<Lang, string> = {
  yue: '大細牌！我開咗張 {card} 點——下一張會大啲定細啲？',
  zh: '比大小！我开了张 {card} 点——下一张会大还是小？',
  ja: '数字ハイアンドロー！今のカードは {card}——次は大きい？小さい？',
  en: 'High-low! I drew a {card} — will the next card be higher or lower?',
};

const HILO_PROMPT: Record<Lang, string> = {
  yue: '講「大」定「細」吖～再嚟？',
  zh: '说「大」还是「小」呀～再来？',
  ja: '「大きい」か「小さい」かな？どっち？',
  en: 'Higher or lower — which one?',
};

const HILO_RIGHT: Record<Lang, string> = {
  yue: '開！係 {next}——你估中咗！連中 {streak} 次！繼續？',
  zh: '开！是 {next}——你猜中了！连中 {streak} 次！继续？',
  ja: 'オープン！{next}だ——正解！{streak}連続！もう一回？',
  en: 'Flip! It\'s a {next} — correct! That\'s {streak} in a row! Again?',
};

const HILO_WRONG: Record<Lang, string> = {
  yue: '開！係 {next}——哎呀失手！你連中 {streak} 次，好勁呀！再玩過？',
  zh: '开！是 {next}——哎呀失手！你连中 {streak} 次，好厉害！再玩一次？',
  ja: 'オープン！{next}かぁ…はずれ！でも{streak}連続はすごいよ！もう一度？',
  en: 'Flip! It\'s a {next} — oh no, streak over! But {streak} in a row is amazing! One more go?',
};

const HILO_EQUAL: Record<Lang, string> = {
  yue: '開！又係 {next}！平手～唔計數，再嚟過？',
  zh: '开！又是 {next}！平局～不算数，再来？',
  ja: 'オープン！{next}、同じ数字！引き分け〜もう一回？',
  en: 'Flip! Another {next} — a tie, no count! Again?',
};

const HILO_MAX: Record<Lang, string> = {
  yue: '連中 {streak} 次都未斷！你係賭神呀？今日到此為止，聽日再嚟？',
  zh: '连中 {streak} 次都没断！你是赌神呀？今天先到这，明天再来？',
  ja: '{streak}連続正解、止まらない！すごすぎ！今日はここまで、また明日ね？',
  en: '{streak} correct in a row — unstoppable! Let\'s rest on that high note, same time tomorrow?',
};

// ------------------------------------------------------------- rps / guess

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
  if (kind === 'guess') {
    const target = 1 + Math.floor(rng() * 20);
    return {
      line: GUESS_START[lang] ?? GUESS_START.en,
      state: { kind, target, lo: 1, hi: 20, userScore: 0, botScore: 0, rounds: 0, maxRounds: 10 },
    };
  }
  if (kind === 'wordchain') {
    const starter = WC_STARTER[lang] ?? WC_STARTER.en;
    return {
      line: fmt(WC_START[lang] ?? WC_START.en, { word: starter, last: lastKey(starter, lang) }),
      state: { kind, target: 0, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 0, maxRounds: 10, lastWord: starter, fails: 0 },
    };
  }
  if (kind === 'omikuji') {
    // one-shot shrine draw — rounds starts at maxRounds so the panel clears
    // the game ref immediately; the draw itself is the whole game
    const roll = rng();
    const tier = roll < 0.15 ? 0 : roll < 0.4 ? 1 : roll < 0.65 ? 2 : roll < 0.85 ? 3 : roll < 0.95 ? 4 : 5;
    return {
      line: (OMIKUJI_LINES[lang] ?? OMIKUJI_LINES.en)[tier]!,
      state: { kind, target: tier, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 1, maxRounds: 1 },
    };
  }
  if (kind === 'hands') {
    return {
      line: HANDS_START[lang] ?? HANDS_START.en,
      state: { kind, target: 0, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 0, maxRounds: 3 },
    };
  }
  const card = 1 + Math.floor(rng() * 13);
  return {
    line: fmt(HILO_START[lang] ?? HILO_START.en, { card }),
    state: { kind: 'hilo', target: 0, lo: 0, hi: 0, userScore: 0, botScore: 0, rounds: 0, maxRounds: 15, card },
  };
}

function scoreEnd(state: GameState, lang: Lang, vars: Record<string, number | string>): { line: string; ended: true } {
  if (state.userScore > state.botScore) return { line: fmt(END_WIN[lang] ?? END_WIN.en, vars), ended: true };
  if (state.userScore < state.botScore) return { line: fmt(END_LOSE[lang] ?? END_LOSE.en, vars), ended: true };
  return { line: fmt(END_DRAW[lang] ?? END_DRAW.en, vars), ended: true };
}

/** the first character/letter/kana the user offers, per language script */
function firstKey(text: string, lang: Lang): string {
  if (lang === 'ja') return text.match(/[ぁ-んァ-ン一-龥]/)?.[0] ?? '';
  if (lang === 'en') return text.match(/[a-z]/i)?.[0]?.toLowerCase() ?? '';
  return text.match(/[一-龥]/)?.[0] ?? '';
}

/** the last character/letter of a word, punctuation stripped */
function lastKey(text: string, lang: Lang): string {
  const cleaned = text.replace(/[\s\p{P}\p{S}〜~]+$/u, '');
  const chars = [...cleaned];
  const c = chars[chars.length - 1] ?? '';
  return lang === 'en' ? c.toLowerCase() : c;
}

function wordchainTurn(state: GameState, text: string, lang: Lang, rng: Rng): TurnResult {
  const required = lastKey(state.lastWord ?? '', lang);
  const offered = firstKey(text, lang);
  if (!offered || offered !== required) {
    const fails = (state.fails ?? 0) + 1;
    const ns: GameState = { ...state, fails };
    if (fails >= 3) return { line: WC_SHE_WIN[lang] ?? WC_SHE_WIN.en, state: ns, ended: true };
    return { line: fmt(WC_MISS[lang] ?? WC_MISS.en, { last: required }), state: ns, ended: false };
  }
  // the classic shiritori trap: no Japanese word starts with ん
  if (lang === 'ja' && lastKey(text, 'ja') === 'ん') {
    return { line: WC_N_END.ja, state, ended: true };
  }
  const bank = WORD_BANK[lang] ?? WORD_BANK.en;
  const options = bank[lastKey(text, lang)] ?? [];
  if (options.length === 0) {
    return {
      line: fmt(WC_USER_WIN[lang] ?? WC_USER_WIN.en, { last: lastKey(text, lang) }),
      state,
      ended: true,
      move: 'jump',
    };
  }
  const word = options[Math.floor(rng() * options.length)]!;
  const rounds = state.rounds + 1;
  const ns: GameState = { ...state, lastWord: word, rounds };
  if (rounds >= state.maxRounds) {
    return { line: WC_DRAW[lang] ?? WC_DRAW.en, state: ns, ended: true, move: 'jump' };
  }
  return { line: fmt(WC_NEXT[lang] ?? WC_NEXT.en, { word, last: lastKey(word, lang) }), state: ns, ended: false };
}

function handsTurn(state: GameState, text: string, lang: Lang, rng: Rng): TurnResult {
  const t = text.toLowerCase();
  let guess = -1;
  if (lang === 'en') {
    if (/\bleft\b/.test(t)) guess = 0;
    else if (/\bright\b/.test(t)) guess = 1;
    else if (/\bmiddle\b|\bcenter\b/.test(t)) guess = 2;
  } else {
    if (/左|ひだり/.test(t)) guess = 0;
    else if (/右|みぎ/.test(t)) guess = 1;
    else if (/中|真ん中/.test(t)) guess = 2;
  }
  if (guess < 0) return { line: HANDS_PROMPT[lang] ?? HANDS_PROMPT.en, state, ended: false };
  const r = rng();
  const hand = r < 1 / 3 ? 0 : r < 2 / 3 ? 1 : 2;
  const rounds = state.rounds + 1;
  const win = guess === hand;
  const userScore = state.userScore + (win ? 1 : 0);
  const botScore = state.botScore + (win ? 0 : 1);
  const ns: GameState = { ...state, userScore, botScore, rounds };
  const names = HAND_NAME[lang] ?? HAND_NAME.en;
  const vars = { hand: names[hand]!, u: userScore, b: botScore };
  if (rounds >= state.maxRounds) {
    const end = scoreEnd(ns, lang, vars);
    return { line: end.line, state: ns, ended: true, move: userScore > botScore ? 'jump' : undefined };
  }
  return { line: fmt(win ? HANDS_WIN[lang] ?? HANDS_WIN.en : HANDS_LOSE[lang] ?? HANDS_LOSE.en, vars), state: ns, ended: false };
}

function hiloTurn(state: GameState, text: string, lang: Lang, rng: Rng): TurnResult {
  const t = text.toLowerCase();
  let guess = 0;
  if (lang === 'en') {
    if (/\bhigher\b|\bup\b|\bhigh\b/.test(t)) guess = 1;
    else if (/\blower\b|\bdown\b|\blow\b/.test(t)) guess = -1;
  } else if (lang === 'ja') {
    if (/大きい|上|高い/.test(t)) guess = 1;
    else if (/小さい|下|低い/.test(t)) guess = -1;
  } else {
    if (/大|高/.test(t)) guess = 1;
    else if (/細|小|低/.test(t)) guess = -1;
  }
  if (guess === 0) return { line: HILO_PROMPT[lang] ?? HILO_PROMPT.en, state, ended: false };
  const next = 1 + Math.floor(rng() * 13);
  const card = state.card ?? 7;
  if (next === card) {
    return { line: fmt(HILO_EQUAL[lang] ?? HILO_EQUAL.en, { next }), state, ended: false };
  }
  const hit = guess === 1 ? next > card : next < card;
  if (!hit) {
    return {
      line: fmt(HILO_WRONG[lang] ?? HILO_WRONG.en, { next, streak: state.userScore }),
      state: { ...state, botScore: state.botScore + 1 },
      ended: true,
      move: state.userScore >= 3 ? 'jump' : undefined,
    };
  }
  const streak = state.userScore + 1;
  const ns: GameState = { ...state, userScore: streak, card: next, rounds: state.rounds + 1 };
  if (ns.rounds >= state.maxRounds) {
    return { line: fmt(HILO_MAX[lang] ?? HILO_MAX.en, { streak }), state: ns, ended: true, move: 'jump' };
  }
  return { line: fmt(HILO_RIGHT[lang] ?? HILO_RIGHT.en, { next, streak }), state: ns, ended: false };
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
  if (state.kind === 'wordchain') return wordchainTurn(state, text, lang, rng);
  if (state.kind === 'omikuji') {
    // one draw per visit — the panel should have cleared us already;
    // if a message still slips through, explain gently and end
    return { line: OMIKUJI_AGAIN[lang] ?? OMIKUJI_AGAIN.en, state, ended: true };
  }
  if (state.kind === 'hands') return handsTurn(state, text, lang, rng);
  if (state.kind === 'hilo') return hiloTurn(state, text, lang, rng);
  if (state.kind === 'rps') return rpsTurn(state, text, lang, rng);
  if (state.kind === 'dice') return diceTurn(state, text, lang, rng);
  return guessTurn(state, text, lang);
}

/** the line she says when the user calls it quits mid-game */
export function gameFarewellLine(lang: Lang): string {
  return FAREWELL[lang] ?? FAREWELL.en;
}
