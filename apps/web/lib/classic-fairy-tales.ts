// Classic European fairy-tale library for demo "telling story".
// Spoken abridgments of public-domain plots (Grimm / Andersen / Perrault /
// English folk). Texts are original paraphrases for TTS — not modern
// copyrighted retellings. Attribution points at Project Gutenberg / PD roots.

import type { Lang } from './prefs';

export type TaleLengthTier = 'short' | 'medium' | 'long' | 'veryLong';

export type ClassicFairyTale = {
  id: string;
  /** Stable slug for rotation / tests. */
  slug: string;
  length: TaleLengthTier;
  /** Traditional author or collectors (public domain). */
  author: string;
  /** Human-readable PD source note. */
  credit: string;
  /** Canonical PD reference (Gutenberg / similar). */
  sourceUrl: string;
  title: Record<Lang, string>;
  /** Spoken body — one language per field; no trailing user-asks. */
  text: Record<Lang, string>;
};

/**
 * Approximate spoken length bands for **English** (chars after whitespace
 * collapse). CJK lines are denser; tier membership is the declared `length`
 * field. Tests assert EN relative ordering across tiers.
 */
export const TALE_LENGTH_BANDS: Record<
  TaleLengthTier,
  { min: number; max: number }
> = {
  short: { min: 180, max: 450 },
  medium: { min: 400, max: 750 },
  long: { min: 550, max: 950 },
  veryLong: { min: 700, max: 1400 },
};

const LENGTH_ROTATION: readonly TaleLengthTier[] = [
  'short',
  'medium',
  'long',
  'veryLong',
];

export function asTaleLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'zh' || lang === 'ja' || lang === 'yue') return lang;
  return 'en';
}

/** Collapse whitespace so spoken-line gate (`\\s{2,}`) stays happy. */
export function formatTaleForSpeech(tale: ClassicFairyTale, lang?: string): string {
  const L = asTaleLang(lang);
  const title = tale.title[L] ?? tale.title.en;
  const body = (tale.text[L] ?? tale.text.en).trim();
  return `${title}. ${body}`.replace(/\s+/g, ' ').trim();
}

export function spokenCharCount(text: string): number {
  return text.replace(/\s+/g, ' ').trim().length;
}

export function classifySpokenLength(text: string): TaleLengthTier {
  const n = spokenCharCount(text);
  if (n <= TALE_LENGTH_BANDS.short.max) return 'short';
  if (n <= TALE_LENGTH_BANDS.medium.max) return 'medium';
  if (n <= TALE_LENGTH_BANDS.long.max) return 'long';
  return 'veryLong';
}

/**
 * Bundled catalog — always available offline. Length tiers mix short through
 * very long; every tale ships en / yue / zh / ja.
 */
export const CLASSIC_FAIRY_TALES: readonly ClassicFairyTale[] = [
  {
    id: 'red-riding-hood-short',
    slug: 'little-red-riding-hood',
    length: 'short',
    author: 'Charles Perrault / Brothers Grimm',
    credit: 'Public-domain Little Red Riding Hood tradition',
    sourceUrl: 'https://www.gutenberg.org/ebooks/2591',
    title: {
      en: 'Little Red Riding Hood',
      yue: '小紅帽',
      zh: '小红帽',
      ja: '赤ずきん',
    },
    text: {
      en:
        'A girl in a red hood walked through the woods to visit her grandmother. A wolf learned where she was going, ran ahead, and pretended to be the grandmother in bed. When the girl came close and saw the long teeth, she cried out. A woodcutter heard her, chased the wolf away, and grandmother and child were safe again.',
      yue:
        '有個戴紅帽嘅女仔行過樹林去探婆婆。一隻狼知咗佢去邊，搶先走去扮成婆婆瞓喺床度。女仔走近見到長牙就大聲叫。一個樵夫聽到，趕走隻狼，婆婆同女仔都平安。',
      zh:
        '有个戴红帽的女孩穿过树林去看望外婆。一只狼知道她要去哪里，抢先跑去装成外婆躺在床上。女孩走近看见长牙，大声叫起来。一个樵夫听见了，赶走了狼，外婆和孩子都平安。',
      ja:
        '赤い頭巾の少女が森を抜けておばあさんを訪ねました。狼は行き先を知ると先回りし、おばあさんになりすましてベッドに横になりました。少女が近づいて長い歯を見ると大声をあげました。木こりの人が助けに来て狼を追い払い、二人は無事でした。',
    },
  },
  {
    id: 'three-pigs-short',
    slug: 'three-little-pigs',
    length: 'short',
    author: 'English folk tale (public domain)',
    credit: 'Public-domain Three Little Pigs tradition',
    sourceUrl: 'https://www.gutenberg.org/ebooks/11592',
    title: {
      en: 'The Three Little Pigs',
      yue: '三隻小豬',
      zh: '三只小猪',
      ja: '三匹の子ぶた',
    },
    text: {
      en:
        'Three little pigs built homes of straw, sticks, and bricks. A wolf blew down the first two houses, but the brick house stood firm. The wolf tried the chimney, tumbled into a pot, and ran away. The three pigs stayed safe in the strong brick house.',
      yue:
        '三隻小豬分別用禾稈、樹枝同磚起屋。狼吹冧咗頭兩間，但磚屋企得穩。狼想由煙囪爬入，跌落煲度就跑咗。三隻小豬喺堅固嘅磚屋入面好安全。',
      zh:
        '三只小猪分别用稻草、树枝和砖盖房子。狼吹倒了前两间，可砖房稳稳站住。狼想从烟囱爬进去，掉进锅里就逃走了。三只小猪在坚固的砖房里很安全。',
      ja:
        '三匹の子ぶたはわら、木の枝、レンガで家を建てました。狼は初めの二軒を吹き倒しましたが、レンガの家はびくともしません。煙突から入ろうとした狼は鍋に落ちて逃げ出し、子ぶたたちは無事でした。',
    },
  },
  {
    id: 'ugly-duckling-medium',
    slug: 'ugly-duckling',
    length: 'medium',
    author: 'Hans Christian Andersen',
    credit: 'Public-domain Andersen — The Ugly Duckling',
    sourceUrl: 'https://www.gutenberg.org/ebooks/27200',
    title: {
      en: 'The Ugly Duckling',
      yue: '醜小鴨',
      zh: '丑小鸭',
      ja: 'みにくいアヒルの子',
    },
    text: {
      en:
        'In a farmyard a late hatchling looked different from the other ducklings, and everyone teased him. He wandered through autumn and a hard winter, lonely and cold, always hoping to belong. When spring returned he saw graceful swans on the water and bowed his head — then he saw his own reflection: he had grown into a swan too. The other swans welcomed him, and he learned that patience and kindness outlast cruel words.',
      yue:
        '農場入面有隻遲出世嘅小鴨同其他鴨仔唔一樣，成日被人笑。佢走過秋天同嚴冬，又凍又孤單，一路想有個歸屬。春天返嚟，佢見到湖面優雅嘅天鵝就低頭——然後睇到自己倒影：原來自己都變成天鵝。其他天鵝歡迎佢，佢明白耐心同善良，勝過刻薄說話。',
      zh:
        '农场里有只晚出生的小鸭和其他鸭子不一样，总被取笑。他走过秋天和严冬，又冷又孤单，一直想找到归属。春天来了，他看见水面上优雅的天鹅，低下头——却看见自己的倒影：原来自己也长成了天鹅。其他天鹅欢迎他，他明白耐心和善良胜过刻薄的话。',
      ja:
        '農場で遅く生まれたひなはほかのアヒルと違って見え、からかわれました。秋と厳しい冬をさまよい、寒さと孤独の中で居場所を探し続けました。春になると湖の白鳥を見てうつむき、水面に映る自分が白鳥になっているのに気づきました。仲間に迎えられ、忍耐とやさしさが意地悪な言葉に勝つと知りました。',
    },
  },
  {
    id: 'cinderella-medium',
    slug: 'cinderella',
    length: 'medium',
    author: 'Charles Perrault',
    credit: 'Public-domain Perrault — Cinderella',
    sourceUrl: 'https://www.gutenberg.org/ebooks/29021',
    title: {
      en: 'Cinderella',
      yue: '灰姑娘',
      zh: '灰姑娘',
      ja: 'シンデレラ',
    },
    text: {
      en:
        'Cinderella worked by the hearth while her stepsisters prepared for a royal ball. A fairy godmother turned a pumpkin into a coach, mice into horses, and rags into a gown, warning that the magic would end at midnight. At the palace the prince danced with her all evening until the clock struck twelve and she fled, leaving one glass slipper. The prince searched the land; the slipper fit only Cinderella. She forgave her family and the palace filled with a kinder kind of joy.',
      yue:
        '灰姑娘喺爐邊做嘢，後母同繼姊就準備去王宮舞會。仙女教母將南瓜變馬車、老鼠變馬、破衫變禮服，叮囑午夜魔法會完。王子成晚同佢跳舞，十二點鐘響佢匆忙走，留低一隻玻璃鞋。王子四處試鞋，得灰姑娘啱。佢原諒咗家人，王宮多咗份溫柔嘅快樂。',
      zh:
        '灰姑娘在炉边干活，继母和姐姐们准备去王宫舞会。仙女教母把南瓜变成马车、老鼠变成马、破衣变成礼服，并提醒午夜魔法会消失。王子整晚与她共舞，十二点钟响她匆忙离开，留下一只水晶鞋。王子走遍全国试鞋，只有灰姑娘合适。她原谅了家人，王宫里多了更温柔的快乐。',
      ja:
        'シンデレラは炉端で働き、継母と姉たちは王宮の舞踏会の支度をしました。妖精の助けでカボチャは馬車に、ネズミは馬に、ぼろはドレスになり、真夜中に魔法が解けると告げられました。王子と踊り明かした彼女は十二時に逃げ、ガラスの靴を一足残しました。靴が合うのはシンデレラだけで、彼女は家族を許し、宮殿はあたたかい喜びに包まれました。',
    },
  },
  {
    id: 'hansel-gretel-long',
    slug: 'hansel-and-gretel',
    length: 'long',
    author: 'Brothers Grimm',
    credit: 'Public-domain Grimm — Hansel and Gretel',
    sourceUrl: 'https://www.gutenberg.org/ebooks/2591',
    title: {
      en: 'Hansel and Gretel',
      yue: '韓賽爾與葛雷特',
      zh: '韩赛尔与格雷特',
      ja: 'ヘンゼルとグレーテル',
    },
    text: {
      en:
        'In a time of hunger, Hansel and Gretel were led deep into the forest. Hansel dropped pale pebbles, and moonlight guided them home the first night. The next time he could only leave breadcrumbs, and birds ate the trail. Lost and weary, the children found a cottage of bread and sugar. A witch welcomed them with sweets, then locked Hansel in a cage to fatten him for her supper. Clever Gretel shoved the witch into her own oven, freed her brother, and filled their pockets with pearls from the cottage chests. Following a shining bird to a wide lake, a kind duck carried them across the water. They returned to their father with treasure, warm bread, and the quiet relief of home.',
      yue:
        '饑荒時候，韓賽爾同葛雷特被人帶入深林。韓賽爾第一次掉白石仔，月光帶佢哋返屋企。第二次得丟麵包屑，雀仔食晒。迷路又攰，佢哋見到一間麵包同糖砌嘅屋。巫婆用甜食歡迎，之後鎖起韓賽爾想養肥做晚餐。聰明嘅葛雷特將巫婆推入爐，救出哥哥，由屋入面嘅箱袋滿珍珠。跟住隻發光雀仔去到大湖，一隻善良嘅鴨載佢哋過水。返到爸爸身邊，有珍寶、暖包，同返屋企嘅安心。',
      zh:
        '饥荒时，韩赛尔和格雷特被带进深林。韩赛尔第一次扔下白石子，月光引他们回家。第二次只能丢面包屑，被鸟吃光了。又累又迷路时，他们发现一间面包和糖做成的小屋。女巫先用甜食欢迎，再把韩赛尔关进笼子准备养肥当晚餐。聪明的格雷特把女巫推进炉子，救出哥哥，从屋里的箱子装满珍珠。跟着一只发光的鸟来到大湖，一只善良的鸭子载他们过水。他们回到父亲身边，带着珍宝、热面包和回家的安心。',
      ja:
        '飢饉のころ、ヘンゼルとグレーテルは森の奥へ連れて行かれました。ヘンゼルは白い小石を落とし、月明かりで一度は家に戻れました。次はパンくずしか追えず、鳥に食べられてしまいました。迷って疲れた兄妹はパンと砂糖の小屋を見つけます。魔女はお菓子でもてなし、ヘンゼルをかごに閉じ込めて太らせようとしました。賢いグレーテルは魔女を炉に押し込み、兄を助け、小屋の箱から真珠を鞄に詰めました。光る鳥に導かれて広い湖へ行き、やさしい鴨に乗って渡り、宝物と温かいパン、そして家の安堵を抱えて父のもとへ戻りました。',
    },
  },
  {
    id: 'sleeping-beauty-long',
    slug: 'sleeping-beauty',
    length: 'long',
    author: 'Charles Perrault / Brothers Grimm',
    credit: 'Public-domain Sleeping Beauty tradition',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1727',
    title: {
      en: 'Sleeping Beauty',
      yue: '睡美人',
      zh: '睡美人',
      ja: '眠り姫',
    },
    text: {
      en:
        'A king and queen invited fairies to bless their newborn daughter, but one uninvited fairy cursed the child to prick her finger on a spindle and die. A kinder fairy softened the curse to a long sleep instead of death. On her fifteenth birthday the princess found an old tower, touched a spindle, and slept — and the whole castle slept with her under roses and silence. A hundred years later a brave prince cut through the thorns that had grown into a wall, woke her with a gentle kiss, and the court awoke to music and morning light. They married in the great hall, and the kingdom remembered that mercy can rewrite a cruel spell into a second chance.',
      yue:
        '國王王后請仙女祝福初生公主，但有個冇獲邀嘅仙女咒佢會被紡錘刺傷而死。另一個善良仙女將死亡改成長睡。十五歲生日，公主喺高塔掂到紡錘就瞓着，成座城堡喺玫瑰同靜默底下一齊瞓。一百年後勇敢王子斬開長成牆嘅荊棘，輕輕一吻叫醒佢，宮廷隨音樂同晨光醒來。佢哋喺大廳結婚，王國記得仁慈可以將惡咒改寫成第二次機會。',
      zh:
        '国王王后请仙女祝福新生公主，却有个未被邀请的仙女诅咒她会被纺锤刺伤而死。另一位善良仙女把死亡改成长睡。十五岁生日那天，公主在高塔碰到纺锤沉睡，整座城堡在玫瑰与寂静中一起睡着。一百年后勇敢的王子拨开长成墙的荆棘，轻轻一吻唤醒她，宫廷随音乐和晨光醒来。他们在大厅结婚，王国记得仁慈可以把恶咒改写成第二次机会。',
      ja:
        '王と王妃は生まれた姫に妖精の祝福を願いましたが、招かれなかった妖精は紡錘で指を刺して死ぬ呪いをかけました。やさしい妖精は死を長い眠りに変えました。十五の誕生日、姫は塔で紡錘に触れ、城中がバラと静寂の中で共に眠りました。百年後、勇敢な王子が壁のように伸びた茨を切り開き、やさしい口づけで姫を起こすと、音楽と朝の光の中で宮廷が目覚めました。大広間で結ばれ、情けが残酷な呪いを二度目のチャンスへ書き換えると国は覚えました。',
    },
  },
  {
    id: 'snow-white-verylong',
    slug: 'snow-white',
    length: 'veryLong',
    author: 'Brothers Grimm',
    credit: 'Public-domain Grimm — Snow-White',
    sourceUrl: 'https://www.gutenberg.org/ebooks/2591',
    title: {
      en: 'Snow-White',
      yue: '白雪公主',
      zh: '白雪公主',
      ja: '白雪姫',
    },
    text: {
      en:
        'A queen wished for a child as white as snow, as red as blood, and as black as ebony, and soon Snow-White was born. After the queen died, a vain stepmother asked her mirror who was fairest; when the mirror named Snow-White, envy grew sharp as glass. A huntsman was ordered to leave the girl in the forest, but he spared her life and she found a cottage of seven dwarfs who let her stay if she kept house kindly and shared their evening bread. Three times the stepmother came in disguise with a tight lace, a poisoned comb, and finally a poisoned apple that looked sweet as summer. Snow-White fell as if dead; the dwarfs laid her in a glass coffin on the mountain so the birds could still see her face. A prince begged to take the coffin home; when his servants stumbled on a root, the apple piece fell from her lips and she awoke to clean air. They married with the dwarfs as guests of honor, and the cruel queen faced the truth her mirror could no longer hide.',
      yue:
        '皇后願望有個似雪咁白、似血咁紅、似烏木咁黑嘅孩子，於是白雪公主出世。皇后去世後，愛美嘅後母問魔鏡邊個最靚；鏡講係白雪，嫉妒就似玻璃咁尖。獵人奉命將女仔丟喺森林，但佢放生咗佢，白雪搵到七個小矮人嘅小屋，答應用心打理同分享晚餐麵包就可以留低。後母三次喬裝嚟：緊身帶、毒梳，最後係好似夏天咁甜嘅毒蘋果。白雪好似死咗，小矮人將佢放喺山上玻璃棺，等雀仔都睇到佢面。王子請求帶棺返去；僕人喺樹根絆跌，蘋果塊由嘴跌出，佢吸入清新空氣醒返。婚禮請小矮人做貴賓，惡毒皇后要面對鏡再也隱唔住嘅真相。',
      zh:
        '王后祈愿有个像雪一样白、像血一样红、像乌木一样黑的孩子，于是白雪公主出生了。王后去世后，爱美的继母问魔镜谁最美；镜子说出白雪时，嫉妒变得像玻璃一样锋利。猎人奉命把女孩丢在森林，却放了她一马；白雪找到七个小矮人的小屋，答应用心持家并分享晚餐面包便可留下。继母三次乔装而来：束带、毒梳，最后是看起来像夏日一样甜的毒苹果。白雪像死去一样，小矮人把她放进山上的玻璃棺，好让鸟儿仍能看见她的脸。王子请求把棺柩带回家；仆人被树根绊倒时，苹果块从嘴里掉出，她吸入清新空气醒来。婚礼请小矮人做贵宾，恶毒的王后面对镜子再也藏不住的真相。',
      ja:
        '王妃は雪のように白く、血のように赤く、黒檀のように黒い子を願って白雪姫が生まれました。王妃の死後、高慢な継母は鏡に誰が一番美しいか問い、鏡が白雪姫と答えると嫉妬はガラスのように鋭くなりました。狩人が森に捨てるよう命じられましたが彼女を助け、七人の小人の小屋に着き、家事をきちんとして夜のパンを分かち合えば滞在できると言われました。継母は三度変装し、締めつける紐、毒のくし、そして夏のように甘く見える毒りんごを届けました。白雪姫は死んだように倒れ、小人たちは山のガラスの棺に安置し、鳥たちも顔を見えるようにしました。王子が棺を家へ運ぶと、従者が根につまずいてりんごの欠片が口から落ち、姫は澄んだ空気を吸って目覚めました。小人を賓客に迎えて結ばれ、残酷な王妃は鏡が隠せなくなった真実に向き合うことになりました。',
    },
  },
  {
    id: 'little-mermaid-verylong',
    slug: 'little-mermaid',
    length: 'veryLong',
    author: 'Hans Christian Andersen',
    credit: 'Public-domain Andersen — The Little Mermaid',
    sourceUrl: 'https://www.gutenberg.org/ebooks/27200',
    title: {
      en: 'The Little Mermaid',
      yue: '小美人魚',
      zh: '小美人鱼',
      ja: '人魚姫',
    },
    text: {
      en:
        'Deep under the sea a youngest mermaid princess longed for the world above the waves, where ships and church bells lived. On her fifteenth year she rose to the surface, saved a shipwrecked prince from the storm, and loved him from afar though he never saw her true face among the foam. She bargained with a sea witch: her bright voice for human legs, and every step would feel like sharp knives on marble. Mute and graceful she danced for the prince in the palace gardens; he cared for her as a dear friend yet chose another bride with a familiar smile. On the wedding night her sisters rose from the deep with a knife — if she ended the prince she could return to foam and family — but she threw the knife into the dark waves and herself into the pale dawn. Instead of vanishing she became a bright daughter of the air, earning a soul by choosing mercy over revenge. The sea kept her song in its shells, and every morning remembered her courage.',
      yue:
        '海底最細嗰個美人魚公主好嚮往浪上面有船同教堂鐘聲嘅世界。十五歲浮出海面，喺風暴中救咗遇難王子，遠遠咁愛佢，但王子喺泡沫入面睇唔到真正嘅佢。佢同海巫交易：用清亮嘅聲換人腳，每一步好似大理石上嘅利刀。佢啞住喺王宮花園優美跳舞；王子當佢係親愛朋友，最後娶咗另一個帶熟悉笑容嘅新娘。婚禮夜，姊姊由深海帶刀上嚟——如果結束王子就可以返泡沫同家人——但佢將刀掟落黑浪，自己躍入淡淡黎明。冇消失，反而變成空氣嘅明亮女兒，用仁慈勝過報復換靈魂。海喺貝殼入面留低佢首歌，每個清晨都記得佢嘅勇氣。',
      zh:
        '海底最小的美人鱼公主向往浪上有船和教堂钟声的世界。十五岁那年她浮出海面，在风暴中救了遇难的王子，远远地爱着他，王子却在泡沫里看不见真正的她。她与海巫交易：用清亮的声音换成人腿，每一步都像大理石上的利刃。她哑着在王宫花园里优雅起舞；王子把她当亲爱的朋友，却另娶了一个带着熟悉笑容的新娘。婚礼夜，姐姐们从深海带刀上来——若结束王子便可回到泡沫与家人——可她把刀扔进黑浪，自己跃入淡淡黎明。她没有消失，而成了空气中明亮的女儿，用仁慈胜过报复赢得灵魂。海在贝壳里留下她的歌，每个清晨都记得她的勇气。',
      ja:
        '海の底で末の人魚姫は、船と教会の鐘がある波の上の世界に憧れていました。十五歳で海面に上がり嵐の難破から王子を助け、遠くから愛しましたが、王子は泡の中で本当の姿を知りません。彼女は海の魔女と取引し、澄んだ声と引き換えに人の足を得て、歩むたび大理石の上の刃物のような痛みを覚えました。声を失ったまま宮殿の庭で優雅に踊り、王子は大切な友として接しましたが、見慣れた笑顔の別の花嫁を選びました。婚礼の夜、姉たちが深みから刀を届け——王子を殺せば泡と家族のもとに戻れる——しかし彼女は刀を暗い波に投げ、自ら淡い夜明けへ身を投じました。消えずに空気の明るい娘となり、復讐より情けを選んで魂を得ました。海は貝に彼女の歌を残し、毎朝がその勇気を覚えました。',
    },
  },
];

export type ClassicFairyTaleStats = {
  total: number;
  byLang: Record<Lang, number>;
  byLength: Record<TaleLengthTier, number>;
  slugs: string[];
};

export function classicFairyTaleStats(
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): ClassicFairyTaleStats {
  const byLang: Record<Lang, number> = { en: 0, yue: 0, zh: 0, ja: 0 };
  const byLength: Record<TaleLengthTier, number> = {
    short: 0,
    medium: 0,
    long: 0,
    veryLong: 0,
  };
  const slugs = new Set<string>();
  for (const tale of catalog) {
    byLength[tale.length] += 1;
    slugs.add(tale.slug);
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const body = tale.text[lang]?.trim() ?? '';
      const title = tale.title[lang]?.trim() ?? '';
      if (body && title) byLang[lang] += 1;
    }
  }
  return {
    total: catalog.length,
    byLang,
    byLength,
    slugs: [...slugs].sort(),
  };
}

export function talesForLength(
  length: TaleLengthTier,
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): ClassicFairyTale[] {
  return catalog.filter((t) => t.length === length);
}

/**
 * Rotate length tiers first, then stories within that tier, so repeat Story
 * taps move short → medium → long → very long and keep changing titles.
 */
export function pickClassicFairyTale(
  lang?: string,
  n = 0,
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): ClassicFairyTale {
  void asTaleLang(lang);
  const tier =
    LENGTH_ROTATION[
      ((n % LENGTH_ROTATION.length) + LENGTH_ROTATION.length) % LENGTH_ROTATION.length
    ]!;
  const pool = talesForLength(tier, catalog);
  const bank = pool.length ? pool : [...catalog];
  const tale =
    bank[
      ((Math.floor(n / LENGTH_ROTATION.length) % bank.length) + bank.length) % bank.length
    ]!;
  return tale;
}

export function classicFairyTalePublicPath(): string {
  return '/stories/classic-fairy-tales.json';
}
