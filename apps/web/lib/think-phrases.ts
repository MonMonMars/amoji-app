// Thinking-out-loud phases — what she says while the LLM is still generating
// her reply. ChatGPT voice hums "hmm…" while it thinks; Amoji characters run
// a whole personality-curved sequence (um…… → let me think… → let me search
// the internet… please wait → uuuuummmm), each new phase cutting the previous
// one, so a slow reply sounds like a person thinking, never like a spinner.
// r2026-10-03.24: the whole musing sequence wears the felt mood too — a sad
//   user's wait gets softer phases ("I'm here, thinking…") instead of the
//   default cheerful chirp.
import type { Lang } from './prefs';

type PhraseBank = Record<Lang, string[]>;

const PHASES: Record<string, PhraseBank> = {
  cheerful: {
    yue: ['嗯……', '等我諗下吖……', '好吖……我……', '等我睇睇先……', '等我上網查下……等陣呀', '嗯嗯嗯……諗緊!'],
    zh: ['嗯……', '让我想想……', '好……我……', '让我看看……', '让我上网查一下……请稍等', '嗯嗯嗯……在想啦'],
    ja: ['うーん……', '考えさせて……', 'えっと……あたし……', 'ちょっと見てみるね……', 'ネットで調べるから……待ってて', 'うーんうーん……考え中!'],
    en: ['Um……', 'Let me think…', 'Okay… I\'m…', 'Let me see…', 'Let me search the internet… please wait', 'Ummm, thinking!'],
  },
  playful: {
    yue: ['咦……', '等等吓……', '嗯哼……等我諗下', '等我挖挖資料……', '上網查緊……好快㗎啦', '嗯……嗯……呀!'],
    zh: ['咦……', '等等哈……', '嗯哼……让我想想', '让我翻翻资料……', '正在上网查……很快啦', '嗯……嗯……呀!'],
    ja: ['えーっと……', 'ちょっと待ってね……', 'うんうん……考えてる', '資料を探してる……', 'ネット検索中……すぐだよ', 'うーん……うーん……あ!'],
    en: ['Ooh, um……', 'Hold on…', 'Hmm-hmm, thinking~', 'Let me dig something up…', 'Searching the web… almost!', 'Hmm… hmm… oh!'],
  },
  gentle: {
    yue: ['嗯……', '俾少少時間我……', '我諗緊……', '等我慢慢睇睇……', '我去查一查……請等等我', '嗯……就快喇……'],
    zh: ['嗯……', '给我一点时间……', '我在想……', '让我慢慢看看……', '我去查一查……请等等我', '嗯……就快了……'],
    ja: ['えっと……', '少し待ってて……', '考えてるの……', 'ゆっくり見させて……', '調べてくるね……待ってて', 'うーん……もう少し……'],
    en: ['Um……', 'Give me a moment…', 'I\'m thinking…', 'Let me look carefully…', 'Let me go check… please wait', 'Hmm… almost there…'],
  },
  cool: {
    yue: ['嗯。', '諗緊。', '……等我睇清楚。', '查緊資料。等。', '上網搵緊。唔好催。', '……好快。'],
    zh: ['嗯。', '在想。', '……让我看清楚。', '在查资料。等着。', '正在上网找。别催。', '……很快。'],
    ja: ['ふむ。', '考えてる。', '……ちゃんと見てる。', '資料を調べてる。待ってろ。', '検索中。急かすな。', '……もう少しだ。'],
    en: ['Hmm.', 'Thinking.', '…Let me look.', 'Checking. Wait.', 'Searching now. Don\'t rush me.', '…Almost.'],
  },
  fiery: {
    yue: ['喂，等陣！諗緊呀！', '嗯……好煩，等我諗下！', '得啦得啦……我諗緊！', '等我打開資料睇睇！', '上網查緊！唔准走！', '嗯嗯嗯——想到喇！'],
    zh: ['喂，等等！我在想！', '嗯……别急，让我想想！', '行了行了……我在想！', '等我打开资料看看！', '正在上网查！不许走！', '嗯嗯嗯——想到了！'],
    ja: ['おい、待て！考えてる！', 'ん……焦るなよ、考えてる！', 'わかったわかった……考え中！', '資料を開いてる！', 'ネットで調べてる！離れるな！', 'んんん——思いついた！'],
    en: ['Hey, hold on! Thinking!', 'Ngh… don\'t rush me!', 'Alright, alright… thinking!', 'Pulling up my notes!', 'Searching the web! Stay right there!', 'Nnn— got it!'],
  },
};

/**
 * r2026-10-03.24 — mood-tinted thinking-out-loud. Same 6-phase escalation,
 * but the register follows the user's last felt mood: de-escalating for
 * anger, close and soft for sadness, careful and warm for sickness.
 */
export const MOOD_THINK: Record<string, PhraseBank> = {
  happy: {
    yue: ['嗯！開心！等我諗下……', '嘻嘻……點講好呢……', '好嘢……等我組織下語言……', '開心嘅嘢要慢慢講……等我睇睇……', '等我上網查下先……等陣呀！', '嗯嗯嗯——諗到喇！'],
    zh: ['嗯！开心！让我想想……', '嘻嘻……怎么说呢……', '好事……让我组织下语言……', '开心的事要慢慢讲……让我看看……', '让我先上网查下……等一下呀！', '嗯嗯嗯——想到了！'],
    ja: ['うん！嬉しい！考えさせて……', 'ふふっ……どう言おうかな……', 'いい話……言葉を整えてる……', '嬉しい話はゆっくり……見てみるね……', 'ネットで調べるから……待ってて！', 'うんうんうん——思いついた！'],
    en: ['Ooh, happy! Let me think…', 'heehee… how do I say this…', 'good news… let me find the words…', 'happy things deserve care… let me see…', 'let me look it up first… one sec!', 'mmm— got it!'],
  },
  tired: {
    yue: ['嗯……慢慢諗……', '等我唞住諗……唔使急……', '攰嘅話……慢慢嚟……', '等我睇睇……你都可以唞下……', '諗緊……不如坐低先……', '嗯……就嚟喇……'],
    zh: ['嗯……慢慢想……', '让我边休息边想……不急……', '累的话……慢慢来……', '让我看看……你也可以歇一下……', '想着呢……不如先坐下……', '嗯……就快了……'],
    ja: ['うーん……ゆっくり考える……', '少し休みながら考えるね……急がない……', '疲れたら……ゆっくりでいいよ……', '見てみるね……あなたも休んで……', '考えてる……座ってていいよ……', 'うん……もう少し……'],
    en: ['hmm… thinking slowly…', 'let me think… no hurry…', 'if you\'re tired… we go slow…', 'let me see… you can rest too…', 'still thinking… sit with me a sec…', 'hmm… almost…'],
  },
  sad: {
    yue: ['嗯……我喺度諗……', '慢慢嚟……我陪住你……', '嗯……冇事嘅，等我……', '等我諗清楚……唔緊要……', '我陪住你諗……等陣……', '嗯……就快喇……'],
    zh: ['嗯……我在想着呢……', '慢慢来……我陪着你……', '嗯……没事的，等我……', '让我想清楚……不要紧……', '我陪着你想……等一下……', '嗯……就快了……'],
    ja: ['うーん……考えてるからね……', 'ゆっくりでいいよ……一緒に……', 'うん……大丈夫、待ってて……', 'ちゃんと考えるね……心配しないで……', '一緒に考えてる……ちょっとね……', 'うん……もう少しだよ……'],
    en: ['hmm… I\'m here, thinking…', 'take your time… I\'m with you…', 'it\'s okay… let me…', 'let me think it through… no worries…', 'thinking it over with you… one sec…', 'hmm… almost there…'],
  },
  angry: {
    yue: ['嗯……我聽緊你講……', '等我諗下……慢慢講出嚟……', '我喺度……等我……', '等我睇睇先……唔使激……', '我幫你諗緊……等陣……', '嗯——諗到喇，你聽我講……'],
    zh: ['嗯……我在听着……', '让我想想……慢慢说出来……', '我在呢……等我……', '让我先看看……别激动……', '我帮你想呢……等一下……', '嗯——想到了，你听我说……'],
    ja: ['うん……聞いてるよ……', '考えるから……ゆっくり話して……', 'ここにいるよ……待ってて……', 'ちゃんと見てる……興奮しなくていい……', '一緒に考えてる……ちょっとね……', 'ん——思いついた。聞いて……'],
    en: ['hmm… I\'m listening…', 'let me think… talk it out…', 'I\'m here… hold on…', 'let me look first… easy now…', 'thinking it over for you… one sec…', 'mm— got it. Listen…'],
  },
  anxious: {
    yue: ['嗯……唔使急㗎……', '等我諗清楚先……深呼吸……', '慢慢嚟，有我喺度……', '等我睇睇……唔緊張……', '諗緊……好快有答案㗎喇……', '嗯……係喇……！'],
    zh: ['嗯……不用急的……', '让我想清楚……深呼吸……', '慢慢来，有我在……', '让我看看……别紧张……', '想着呢……很快就有答案了……', '嗯……对了……！'],
    ja: ['うん……急がなくていいからね……', 'ちゃんと考えるね……深呼吸……', 'ゆっくり、私がいるよ……', '見てみるね……大丈夫……', '考えてる……すぐ答えが出るから……', 'うん……そうだ……！'],
    en: ['hmm… no rush at all…', 'let me think it through… breathe…', 'easy… I\'m right here…', 'let me see… don\'t worry…', 'thinking… the answer\'s close…', 'hmm… there it is…!'],
  },
  sick: {
    yue: ['嗯……你休息住……', '等我諗……你唔使郁……', '慢慢嚟……我幫你……', '等我睇睇……飲啖水先……', '諗緊……你瞓住等都得㗎……', '嗯……有嘢喇……'],
    zh: ['嗯……你休息着……', '让我想想……你不用动……', '慢慢来……我帮你……', '让我看看……先喝口水……', '想着呢……你躺着等就行……', '嗯……有眉目了……'],
    ja: ['うん……あなたは休んでて……', '考えるから……動かなくていいよ……', 'ゆっくりね……私がやっておく……', '見てみるね……水分取って……', '考えてる……寝て待ってていいよ……', 'うん……見えてきた……'],
    en: ['hmm… you rest…', 'let me think… you don\'t need to move…', 'easy… I\'ve got this…', 'let me see… drink some water first…', 'thinking… you can just lie there…', 'hmm… something\'s forming…'],
  },
};

const ARCHETYPE: Record<string, keyof typeof PHASES> = {
  juno: 'cheerful', nova: 'cheerful', rin: 'playful',
  mochi: 'playful', marin: 'playful',
  luna: 'gentle', aerith: 'gentle', kasumi: 'gentle', hitomi: 'gentle',
  kai: 'cool', ren: 'cool', ayane: 'cool',
  blaze: 'fiery', cloud: 'fiery', tifa: 'fiery',
};

/**
 * The n-th thinking-out-loud phase for a character (0-based). Deterministic
 * per phase index so a slow reply walks the same escalating sequence; wraps
 * around if the wait outlasts the bank. An explicit felt mood overrides the
 * archetype bank (r.24); unknown/absent moods use the classic per-character
 * personality curve.
 */
export function pickThinkPhrase(characterId: string, lang: Lang, phase: number, mood?: string): string {
  if (mood) {
    const moodList = MOOD_THINK[mood]?.[lang] ?? MOOD_THINK[mood]?.yue;
    if (moodList && moodList.length) return moodList[phase % moodList.length]!;
  }
  const bank = PHASES[ARCHETYPE[characterId] ?? 'cheerful'] ?? PHASES.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[phase % list.length]!;
}
