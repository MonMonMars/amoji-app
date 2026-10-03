'use client';
// Mood-tinted idle chatter — r2026-10-03.24.
// The regular idle bank (persona-chatter.ts) speaks in the character's own
// voice; this table lets the SAME quiet moments wear the last felt mood —
// after "I'm so tired" her idle lines turn soft ("borrow some of my energy,
// I charge fast") instead of chirping; after anger they turn de-escalating.
// Kept as a separate small module so persona-chatter.ts (and the tests that
// pin its behavior) stay untouched; unknown moods return undefined and the
// caller falls back to the persona bank.
import type { Lang } from './prefs';

export const MOOD_IDLE: Record<string, Record<Lang, string[]>> = {
  happy: {
    en: ['You\'re in such a good mood today — it\'s contagious, you know.', 'I keep catching myself smiling. That\'s entirely your fault.', 'Good days look really good on you.', 'Whatever made today bright, I\'m quietly grateful for it.'],
    yue: ['你今日心情好好喎，會傳染㗎。', '我成日忍唔住自己笑，呢筆帳計你頭上。', '開心嘅日子真係好襯你。', '今日咩事咁開心我都未知，但我暗中多謝佢。'],
    zh: ['你今天心情好好呀，会传染的。', '我总是忍不住自己笑，这笔账算你头上。', '开心的日子真的很衬你。', '今天什么事这么开心我还不知道，但我暗中谢谢它。'],
    ja: ['今日ずっとご機嫌だね。うつっちゃうよ。', 'つい笑顔になってる自分がいるの。全部あなたのせい。', '楽しい日って、とてもお似合い。', '今日を明るくした何かに、こっそりお礼を言っておくね。'],
  },
  tired: {
    en: ['You sounded worn out earlier — still running on empty?', 'Rest a little. I\'ll keep the light on and the conversation warm.', 'Today doesn\'t need to be won. Just survived, gently.', 'If you\'re low on energy, borrow some of mine. I charge fast.'],
    yue: ['你頭先聽落攰到爆——仲頂唔頂得順呀？', '唞吓啦，我會留住盞燈同份溫柔嘅傾偈。', '今日唔使贏，輕輕鬆鬆捱過去就得。', '能量唔夠就借我嘅，我充電好快㗎。'],
    zh: ['你刚才听起来累坏了——还撑得住吗？', '休息一下吧，我会留住这盏灯和这场温柔的聊天。', '今天不需要赢，轻轻熬过去就好。', '能量不够就借我的，我充电很快的。'],
    ja: ['さっきすごく疲れてたよね——まだ持つ？', '少し休んで。私が明かりとぬくもりの会話を守ってる。', '今日は勝たなくていい。そっと乗り越えれば十分。', '元気が足りないなら私のを貸すよ。充電は速いんだ。'],
  },
  sad: {
    en: ['Hey… I\'m right here. Talk, or don\'t. Either way, I stay.', 'You seemed a little down earlier. I\'ve been thinking about you.', 'No pressure to cheer up on my account. I like you in every weather.', 'Quiet is okay. I\'m very good at quiet company.'],
    yue: ['喂……我喺度㗎。講又得，唔講都得，我都會留喺度。', '你頭先好似有啲唔開心……我一路掛住你。', '唔使為我扮開心㗎，咩天氣嘅你我都鍾意。', '靜唔緊要，我最擅長嘅就係靜靜哋陪你。'],
    zh: ['嘿……我在呢。说也行，不说也行，我都会在这儿。', '你刚才好像有点不开心……我一直在惦记你。', '不用为了我假装开心，什么天气的你我都喜欢。', '安静没关系，我最擅长的就是静静地陪你。'],
    ja: ['ねえ……ここにいるよ。話しても黙ってても、私はいるから。', 'さっき少し落ち込んでたよね。ずっと気にしてた。', '無理に元気になる必要ないよ。どんな天気のあなたも好き。', '静かでいいよ。静かなお供はとても得意なの。'],
  },
  angry: {
    en: ['Still simmering? Vent away — I\'m flameproof.', 'I\'m on your side. That\'s not a mood, it\'s a fact.', 'Want to throw something? Here, have this imaginary plate.', 'Deep breath in… out… I\'m not going anywhere.'],
    yue: ['仲喺度滾緊？儘管同我出氣——我防火㗎。', '我企你嗰邊，呢個唔係心情，係事實。', '想掟嘢？嚟，俾隻諗像中嘅碟你掟。', '吸啖氣……呼……我邊度都唔去㗎。'],
    zh: ['还在气头上？尽管冲我出气——我防火的。', '我站在你这边，这不是心情，是事实。', '想扔东西？来，给你一只想象中的盘子扔。', '吸一口气……呼……我哪儿都不去。'],
    ja: ['まだ煮えてる？どんどん吐き出して——私は防火仕様だよ。', '僕は君の味方。気分じゃなくて、事実。', '何か投げたい？はい、想像のお皿をどうぞ。', '大きく吸って……吐いて……僕はどこにも行かないよ。'],
  },
  anxious: {
    en: ['Hey… whatever it is, we\'ll untangle it one loop at a time.', 'Your worry is welcome here. Set it down by the door for a bit.', 'One breath at a time. I\'ll count if you like.', 'You\'re not carrying this alone anymore. I\'m on your side of the rope.'],
    yue: ['喂……唔理係咩，我哋一個圈一個圈咁解開佢。', '你嘅擔心喺度好受歡迎㗎，暫時放低喺門口啦。', '一次一啖氣，鍾意嘅話我幫你數。', '你唔使一個人孭㗎喇，我企喺你嗰邊一齊拉。'],
    zh: ['嘿……不管是什么，我们一圈一圈地解开它。', '你的担心在这里很受欢迎，先暂时放在门口吧。', '一次一口气，喜欢的话我帮你数。', '你不用再一个人背了，我站在你那边一起拉。'],
    ja: ['ねえ……なんであって、一つずつ解いていこ。', 'あなたの心配、ここでは大歓迎。しばらく入口に置いていって。', 'いっぱいずつ呼吸。数えたかったら一緒に数えるよ。', 'もう一人で運ばなくていい。私はあなた側で引くよ。'],
  },
  sick: {
    en: ['How are you feeling? Water, rest, and maybe a doctor — that\'s the whole list.', 'I wish I could make actual soup. Imagine I just handed you a bowl.', 'Your only job today is getting better. I\'ve taken care of the rest.', 'I\'m keeping everything cozy. Your part is simply to rest.'],
    yue: ['而家覺得點呀？飲水、休息，睇醫生，清單就咁多。', '我真係想整碗湯俾你。當我啱啱端咗一碗俾你啦。', '你今日唯一嘅任務係好返，其他嘢我搞掂晒。', '我會將一切保持暖笠笠，你淨係負責休息。'],
    zh: ['现在感觉怎么样？喝水、休息、看医生，清单就这么多。', '我真想给你做碗汤。就当我刚端了一碗给你吧。', '你今天唯一的任务是快点好，其他的我都搞定了。', '我会把一切弄得暖暖的，你只负责休息。'],
    ja: ['今どんな感じ？水分、休息、必要ならお医者さん。リストはそれだけ。', '本物のスープを作りたかったな。今お碗を渡したと思って。', '今日のあなたの仕事は治ることだけ。あとは私がやっておく。', 'ぬくぬくにしておくから、あなたは休むだけでいいの。'],
  },
};

/**
 * The n-th mood-tinted idle line (0-based, wraps). Returns undefined for
 * moods/languages with no bank so the caller falls back to the persona bank.
 */
export function pickMoodIdleLine(mood: string, lang: Lang, n: number): string | undefined {
  const bank = MOOD_IDLE[mood];
  const list = bank?.[lang] ?? bank?.yue;
  if (!list || !list.length) return undefined;
  return list[n % list.length];
}
