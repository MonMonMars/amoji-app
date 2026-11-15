// Classic European fairy-tale library for demo "telling story".
// Spoken emotional retellings of public-domain plots (Grimm / Andersen /
// Perrault / English folk). Texts are original paraphrases for TTS — not
// modern copyrighted retellings. Attribution points at Project Gutenberg / PD roots.
// Delivery aims for full narrative beats (dialogue, sensory detail, feeling)
// — not a flat short summary.

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
  short: { min: 450, max: 900 },
  medium: { min: 800, max: 1400 },
  long: { min: 1200, max: 2000 },
  veryLong: { min: 1600, max: 2800 },
};

/** Prefer medium+ so Story chip is never a flat short synopsis first. */
const LENGTH_ROTATION: readonly TaleLengthTier[] = [
  'medium',
  'long',
  'veryLong',
  'long',
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
 * very long; every tale ships en / yue / zh / ja with emotional spoken prose.
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
        'Once, a gentle girl in a bright red hood set out through the whispering woods to visit her grandmother, carrying a basket of warm bread and sweet butter. Sunlight flickered between the leaves, and birds sang soft warnings she was too kind to hear. A cunning wolf stepped from the shadows and asked, in a honey voice, where she was going. "To Grandmother\'s cottage," she answered, holding the basket close. The wolf ran ahead along a darker path, swallowed the grandmother whole, and slipped into her nightcap and bed. When the girl arrived, she felt a chill — "Grandmother, what big eyes you have… what big teeth!" The wolf sprang; she cried out in terror. A woodcutter heard that cry, burst through the door, and drove the wolf into the forest. Grandmother and child held each other, hearts still pounding, and the little red hood never again walked that lonely path alone.',
      yue:
        '從前有個溫柔女仔戴住鮮紅帽，拎住熱麵包同甜牛油籃，穿過沙沙作響嘅樹林去探婆婆。陽光喺葉隙間閃，雀仔輕輕唱警告，但佢太善良聽唔入耳。一隻狡猾嘅狼由陰影走出嚟，用蜜糖聲問佢去邊。「去婆婆屋企呀。」佢將籃抱實答。狼行暗路搶先，吞咗婆婆，戴起睡帽瞓上床。女仔入到屋覺得凍：「婆婆，你隻眼好大……你啲牙好大！」狼撲出嚟，佢嚇到大叫。樵夫聽到衝入屋，將狼趕入森林。婆婆同女仔攬住對方，心跳未定；之後小紅帽再唔會一個人行嗰條寂寞小路。',
      zh:
        '从前有个温柔的女孩戴着鲜红帽子，提着热面包和甜黄油篮子，穿过沙沙作响的树林去看望外婆。阳光在叶隙间闪烁，鸟儿轻轻唱着警告，可她太善良听不进去。一只狡猾的狼从阴影里走出来，用蜜糖般的声音问她去哪里。“去外婆家。”她抱紧篮子回答。狼走暗路抢先，吞下外婆，戴上睡帽躺上床。女孩进门感到一阵寒意：“外婆，你的眼睛好大……你的牙好大！”狼扑过来，她吓得大叫。樵夫听见冲进屋，把狼赶进森林。外婆和孩子紧紧相拥，心还在跳；从此小红帽再也不独自走那条寂寞小路。',
      ja:
        'むかし、あたたかいパンと甘いバターの籠を抱えた赤い頭巾のやさしい少女が、木々のささやく森を抜けておばあさんを訪ねました。木漏れ日が揺れ、鳥がそっと警告を歌いましたが、彼女は優しすぎて聞き逃しました。ずる賢い狼が影から現れ、蜜のような声で行き先を尋ねます。「おばあさんのお家へ」と彼女は籠を抱きしめて答えました。狼は暗い道を先回りし、おばあさんを飲みこみ、ナイトキャップをかぶってベッドに横になりました。少女は寒気を感じ、「おばあさん、なんて大きな目……なんて大きな歯」と言うと狼が飛びかかり、彼女は恐れて叫びました。木こりがその声を聞き、戸を破って狼を森へ追い払い、二人は胸を寄せ合って安心しました。それから少女は、二度とその寂しい道を一人では歩きませんでした。',
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
        'Three little pigs left home with hopeful hearts, each dreaming of a safe place of their own. The first built quickly of straw, laughing as the wind played through the walls. The second chose sticks, humming while he worked. The third pig, quieter and careful, laid brick upon brick until his house stood warm and strong. Then a hungry wolf came breathing hard. "Little pig, little pig, let me come in!" he howled. "Not by the hair of my chinny chin chin!" cried each brother. The wolf huffed and puffed the straw house down, then the stick house, and the two frightened pigs raced to the brick cottage, trembling in each other\'s arms. At the brick door the wolf blew until he was dizzy — the walls did not move. He tried the chimney, tumbled into a pot of hot water, and fled howling into the night.',
      yue:
        '三隻小豬懷住希望離開屋企，各自想有個安全嘅家。大哥用禾稈起得好快，笑住任風穿牆。二哥用樹枝，一面做一面哼歌。細佬安靜又小心，一塊磚一塊磚起，屋企又暖又穩。之後一隻肚餓嘅狼喘住氣嚟：「小豬小豬，俾我入嚟！」每隻都喊：「唔得！」狼吹冧禾稈屋同樹枝屋，兩隻嚇到震嘅豬仔跑入磚屋，攬住對方發抖。喺磚門前狼吹到頭暈——牆唔郁。佢由煙囪爬入，跌落熱水煲，嚎住逃入夜。三隻小豬喺火旁分麵包，感激耐心、勇氣，同一個撐得住嘅家。',
      zh:
        '三只小猪怀着希望离开家，各自梦想有个安全的窝。大哥用稻草盖得很快，笑着任风穿墙。二哥用树枝，一边做一边哼歌。小弟安静又仔细，一块砖一块砖砌，房子又暖又稳。后来一只饿狼喘着气来了：“小猪小猪，让我进去！”每只都喊：“不行！”狼吹倒了稻草屋和树枝屋，两只吓得发抖的小猪跑进砖房，互相紧紧抱着。在砖门前狼吹到头晕——墙纹丝不动。他从烟囱爬进去，掉进热水锅，嚎叫着逃进夜色。三只小猪在火旁分面包，感激耐心、勇气和一个撑得住的家。',
      ja:
        '三匹の子ぶたは希望を胸に家を出て、それぞれ安全な居場所を夢見ました。長男はわらで大急ぎの家を建て、風が壁をぬけるのを笑いました。次男は木の枝で、口ずさみながら作りました。末の子は静かで慎重に、レンガを重ねてあたたかく強い家を建てました。やがて腹をすかせた狼が息を荒げて来ます。「子ぶたよ、入れておくれ！」と吠え、「絶対にだめ！」と兄弟は答えました。狼はわらの家と枝の家を吹き倒し、震える二匹はレンガの家へ逃げ込み、抱き合いました。レンガの戸口で狼はめまいがするほど吹きましたが壁は動きません。煙突から入り熱い鍋に落ち、夜へ逃げ去りました。三匹は火のそばでパンを分け、忍耐と勇気、そして守ってくれる家に感謝しました。',
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
        'In a busy farmyard one late summer, a last egg cracked open and a hatchling stepped out who looked nothing like the other ducklings. His feathers were grey, his neck too long, and the farmyard laughed. "What an ugly thing," said the old duck, and the little ones pecked him away from the bread crumbs. Night after night he hid behind the reeds, whispering to the moon, "Where do I belong?" Autumn painted the pond gold; winter locked it in ice. He wandered alone through frost and hunger, almost forgetting the sound of kindness. When spring returned, the ice sang as it broke, and he saw three graceful swans gliding on open water. Shame bowed his head — then he saw his own reflection: white feathers, a long proud neck, a swan among swans. The others drifted near and touched him with soft wings. "You were never ugly," the wind seemed to say. "You were only becoming." Tears of relief warmed his bill, and he finally understood that patience and gentle hope can outlast every cruel word.',
      yue:
        '農場入面有隻遲出世嘅小鴨同其他鴨仔唔一樣，成日被人笑。佢走過秋天同嚴冬，又凍又孤單，一路想有個歸屬。春天返嚟，佢見到湖面優雅嘅天鵝就低頭——然後睇到自己倒影：原來自己都變成天鵝。其他天鵝歡迎佢，用軟翼輕輕掂住。風好似講：「你從來唔醜，你只係未長成。」解脫嘅淚暖住喙，佢明白耐心同善良，勝過刻薄說話。',
      zh:
        '农场里有只晚出生的小鸭和其他鸭子不一样，总被取笑。他走过秋天和严冬，又冷又孤单，一直想找到归属。春天来了，他看见水面上优雅的天鹅，低下头——却看见自己的倒影：原来自己也长成了天鹅。其他天鹅欢迎他，用柔软的翅膀轻轻碰他。风仿佛说：“你从不丑陋，你只是还在长成。”解脱的泪水温暖了喙，他明白耐心与善良胜过刻薄的话。',
      ja:
        '農場で遅く生まれたひなはほかのアヒルと違って見え、からかわれました。秋と厳しい冬をさまよい、寒さと孤独の中で居場所を探し続けました。春になると湖の白鳥を見てうつむき、水面に映る自分が白鳥になっているのに気づきました。仲間に迎えられ柔らかい翼で触れられ、忍耐とやさしさが意地悪な言葉に勝つと知りました。',
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
        'By the cold hearth, Cinderella scrubbed ash from her hands while her stepsisters laughed into mirrors, dressing for the royal ball. "You stay home," they said, and her heart ached with quiet longing. Then a soft light filled the kitchen — a fairy godmother with kind eyes. "You shall go," she whispered, turning a pumpkin into a gleaming coach, mice into proud horses, and rags into a gown that shimmered like moonlight. "Be home by midnight, my dear — the magic ends then." At the palace the prince could not look away; they danced as if the world had slowed just for them. When the clock struck twelve she fled down the steps, leaving one glass slipper flashing on the stone. The prince searched every house; the slipper fit only Cinderella\'s gentle foot. She forgave her family with trembling courage, and the hall filled not with triumph alone but with a kinder joy — the joy of being seen at last for who she truly was.',
      yue:
        '灰姑娘喺凍爐邊做嘢，繼姊對住鏡笑住準備舞會。仙女教母將南瓜變馬車、老鼠變馬、破衫變禮服，叮囑午夜魔法會完。王子成晚同佢跳舞，十二點鐘響佢匆忙走，留低一隻玻璃鞋。王子四處試鞋，得灰姑娘啱。佢用顫抖勇氣原諒家人，王宮多咗份溫柔快樂——終於被人睇見真正自己。',
      zh:
        '灰姑娘在冰冷炉边干活，姐姐们对着镜子笑着准备舞会。仙女教母把南瓜变成马车、老鼠变成马、破衣变成礼服，并提醒午夜魔法会消失。王子整晚与她共舞，十二点钟响她匆忙离开，留下一只水晶鞋。王子走遍全国试鞋，只有灰姑娘合适。她以颤抖的勇气原谅家人，王宫里多了更温柔的快乐——终于被看见真实的自己。',
      ja:
        'シンデレラは冷たい炉端で働き、姉たちは鏡に笑いながら舞踏会の支度をしました。妖精の助けでカボチャは馬車に、ネズミは馬に、ぼろはドレスになり、真夜中に魔法が解けると告げられました。王子と踊り明かした彼女は十二時に逃げ、ガラスの靴を残しました。靴が合うのはシンデレラだけで、彼女は震える勇気で家族を許し、ほんとうの自分を見てもらえたあたたかい喜びに包まれました。',
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
        'In a lean year when the cupboards whispered emptiness, Hansel and Gretel were led deep into a forest that smelled of pine and fear. Hansel squeezed his sister\'s hand. "Do not be afraid," he said, and dropped pale pebbles that shone like tiny moons along the dark path. By moonlight they followed the trail home, and for one night their father\'s arms felt safe again; their stepmother\'s silence still chilled the room. The next journey left them with only breadcrumbs; birds ate every crumb, and the path vanished into green shadow. Lost and hungry, Gretel cried softly while Hansel kept walking. At last they found a cottage of bread walls and sugar windows that glittered like hope against the gloom. A thin voice invited them in with sweets — then the door locked with a click that stole their breath. The witch\'s eyes were cold as iron. She caged Hansel to fatten him and set Gretel to hard work by the fire. Night after night Gretel whispered through the bars, "I will not leave you — hold on." When the witch ordered her to check the oven heat, clever Gretel asked for a lesson; as the witch leaned in, Gretel pushed with all her love and fear, and the cruel spell ended in fire and smoke. Freeing her brother with shaking hands, they filled their pockets with pearls from the cottage chests, hearts still racing. A shining bird led them to a wide lake; a kind duck carried them across cool water under a pale sky. They returned to their father with treasure, warm bread, and tears that tasted of home — proof that courage shared between two small hearts can outshine the darkest wood.',
      yue:
        '饑荒時候，韓賽爾同葛雷特被人帶入深林。韓賽爾第一次掉白石仔，月光帶佢哋返屋企。第二次得丟麵包屑，雀仔食晒。迷路又攰，佢哋見到麵包同糖砌嘅屋。巫婆用甜食歡迎，之後鎖起韓賽爾想養肥做晚餐。聰明嘅葛雷特將巫婆推入爐，救出哥哥，由屋入面嘅箱袋滿珍珠。跟住隻發光雀仔去到大湖，一隻善良嘅鴨載佢哋過水。返到爸爸身邊，有珍寶、暖包，同返屋企嘅安心——兩顆細小心臟分享嘅勇氣，照亮最黑樹林。',
      zh:
        '饥荒时，韩赛尔和格雷特被带进深林。韩赛尔第一次扔下白石子，月光引他们回家。第二次只能丢面包屑，被鸟吃光了。又累又迷路时，他们发现一间面包和糖做成的小屋。女巫先用甜食欢迎，再把韩赛尔关进笼子准备养肥当晚餐。聪明的格雷特把女巫推进炉子，救出哥哥，从屋里的箱子装满珍珠。跟着一只发光的鸟来到大湖，一只善良的鸭子载他们过水。他们回到父亲身边，带着珍宝、热面包和回家的安心——两颗小小心脏分享的勇气，能照亮最黑的树林。',
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
        'A king and queen invited every fairy but one to bless their newborn daughter. Music filled the hall; gifts of beauty, grace, and song were laid upon the cradle like soft light. Then the uninvited fairy swept in on a cold wind that made the candles shiver. "She shall prick her finger on a spindle and die," she hissed, and fear froze every heart in the room. A kinder fairy stepped forward, eyes shining with mercy. "Not death," she said softly, laying a hand above the child, "but a sleep as deep as winter — until love finds her and wakes her gently." Years passed in careful joy; spindles were banned, yet curiosity still grew. On her fifteenth birthday the princess wandered the quiet towers alone and found an old woman spinning gold thread. "What is that bright wheel?" she asked, curious as morning. The spindle kissed her finger; she fell as if into a dream, and the whole castle slept with her — cooks mid-stir, dogs mid-bark, roses climbing the walls, silence thick as velvet. A hundred years later a brave prince heard the old tale and cut through thorns that had grown into a living wall, scratching his hands yet never turning back. He found her still as snow, and his gentle kiss was not conquest but tenderness and hope. She woke with a breath like spring; the court woke to music and morning light pouring through dusty windows. They married in the great hall, and the kingdom remembered that mercy can rewrite a cruel spell into a second chance — and that true waking begins with kindness.',
      yue:
        '國王王后請仙女祝福初生公主，但有個冇獲邀嘅仙女咒佢會被紡錘刺傷而死。另一個善良仙女將死亡改成長睡。十五歲生日，公主喺高塔掂到紡錘就瞓着，成座城堡喺玫瑰同靜默底下一齊瞓。一百年後勇敢王子斬開長成牆嘅荊棘，輕輕一吻叫醒佢，宮廷隨音樂同晨光醒來。佢哋喺大廳結婚，王國記得仁慈可以將惡咒改寫成第二次機會——真正醒來由善良開始。',
      zh:
        '国王王后请仙女祝福新生公主，却有个未被邀请的仙女诅咒她会被纺锤刺伤而死。另一位善良仙女把死亡改成长睡。十五岁生日那天，公主在高塔碰到纺锤沉睡，整座城堡在玫瑰与寂静中一起睡着。一百年后勇敢的王子拨开长成墙的荆棘，轻轻一吻唤醒她，宫廷随音乐和晨光醒来。他们在大厅结婚，王国记得仁慈可以把恶咒改写成第二次机会——真正的醒来从善良开始。',
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
        'A queen once stood by a window in winter, wishing aloud for a child as white as snow, as red as blood, and as black as ebony wood. Soon Snow-White was born with a laugh like a bell, and the queen\'s joy was soft and fierce. After she died, a vain stepmother asked her magic mirror who was fairest in the land. Day after day the mirror answered her name — until one morning it named Snow-White, and envy grew sharp as broken glass in the queen\'s chest. "Take her into the forest," she ordered a huntsman, "and do not bring her home." The huntsman raised his knife beneath the pines, then lowered it, trembling with shame. "Run, child," he whispered, tears in his beard, and she fled through roots and shadows until her legs ached and she found a cottage of seven dwarfs. They returned at dusk, surprised, then kind. "You may stay," they said, warming soup, "if you keep house with care and share our evening bread." For a time the cottage glowed with laughter, shared songs, and the comfort of belonging. Three times the stepmother came in disguise — first with a lace pulled too tight around Snow-White\'s breath, then a poisoned comb that burned her scalp, and at last a red apple that smelled of summer orchards. "One bite, sweet girl," she coaxed with a smile that did not reach her eyes. Snow-White fell as if dead among the flowers. The dwarfs wept through the night and laid her in a glass coffin on the mountain so the birds could still see her peaceful face. A prince riding by begged to take the coffin home with honor; when his servants stumbled on a root, the apple piece slipped from her lips and she drew a clean breath of cold mountain air. She woke to tears, cheers, and soft dwarfs\' hands. They married with the dwarfs as guests of honor, and the cruel queen faced the truth her mirror could no longer hide — that beauty without mercy is only a shadow, while kindness endures and lights the darkest glass.',
      yue:
        '皇后願望有個似雪咁白、似血咁紅、似烏木咁黑嘅孩子，於是白雪公主出世。皇后去世後，愛美嘅後母問魔鏡邊個最靚；鏡講係白雪，嫉妒就似玻璃咁尖。獵人奉命將女仔丟喺森林，但佢放生咗佢，白雪搵到七個小矮人嘅小屋，答應用心打理同分享晚餐麵包就可以留低。後母三次喬裝嚟：緊身帶、毒梳，最後係好似夏天咁甜嘅毒蘋果。白雪好似死咗，小矮人將佢放喺山上玻璃棺。王子請求帶棺返去；僕人喺樹根絆跌，蘋果塊由嘴跌出，佢吸入清新空氣醒返。婚禮請小矮人做貴賓，惡毒皇后要面對鏡再也隱唔住嘅真相——冇仁慈嘅美只係影，善良先至長久。',
      zh:
        '王后祈愿有个像雪一样白、像血一样红、像乌木一样黑的孩子，于是白雪公主出生了。王后去世后，爱美的继母问魔镜谁最美；镜子说出白雪时，嫉妒变得像玻璃一样锋利。猎人奉命把女孩丢在森林，却放了她一马；白雪找到七个小矮人的小屋，答应用心持家并分享晚餐面包便可留下。继母三次乔装而来：束带、毒梳，最后是看起来像夏日一样甜的毒苹果。白雪像死去一样，小矮人把她放进山上的玻璃棺。王子请求把棺柩带回家；仆人被树根绊倒时，苹果块从嘴里掉出，她吸入清新空气醒来。婚礼请小矮人做贵宾，恶毒的王后面对镜子再也藏不住的真相——没有仁慈的美只是影子，善良才会长久。',
      ja:
        '王妃は雪のように白く、血のように赤く、黒檀のように黒い子を願って白雪姫が生まれました。王妃の死後、高慢な継母は鏡に誰が一番美しいか問い、鏡が白雪姫と答えると嫉妬はガラスのように鋭くなりました。狩人が森に捨てるよう命じられましたが彼女を助け、七人の小人の小屋に着き、家事をきちんとして夜のパンを分かち合えば滞在できると言われました。継母は三度変装し、締めつける紐、毒のくし、そして夏のように甘く見える毒りんごを届けました。白雪姫は死んだように倒れ、小人たちは山のガラスの棺に安置しました。王子が棺を家へ運ぶと、従者が根につまずいてりんごの欠片が口から落ち、姫は澄んだ空気を吸って目覚めました。小人を賓客に迎えて結ばれ、残酷な王妃は鏡が隠せなくなった真実に向き合うことになりました。',
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
        'Deep under the sea, where light filtered green and soft through kelp forests, the youngest mermaid princess listened for the world above — ships creaking, church bells, and human laughter she had never touched with her hands. Her sisters brought back stories; she brought back longing. On her fifteenth year she rose through the foam under a wild sky, and a storm tore a prince from his ship into black water. She held his head above the waves, her heart pounding with a love so sudden it hurt her chest, and left him breathing on the shore though he never saw her true face among the spray. Night after night in her coral bed she dreamed of his eyes and the warmth of air. She swam to a sea witch in a cave that smelled of salt and fear. The bargain was cruel: her bright singing voice for human legs, and every step would feel like knives on marble. "Still," she signed with trembling hands, "I will try — for love." Mute and graceful she danced for the prince in palace gardens under lantern light; he cared for her as a dear friend, stroking her hair, yet chose another bride whose smile felt familiar from a rescue he could not quite remember. On the wedding night her sisters rose from the deep with a knife bright as fish-scale. "End him," they pleaded through tears, "and come home to foam and family — we miss your song." Tears burned her silent throat. She looked at the sleeping prince, kissed him once with all the words she could not speak, threw the knife into the dark waves, and stepped herself into the pale dawn beyond the ship. Instead of vanishing she became a bright daughter of the air, earning a soul by choosing mercy over revenge. The sea kept her song in its shells, and every morning remembered her courage — that the bravest love sometimes means letting go, and still becoming more than you were.',
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
 * taps move medium → long → very long and keep changing titles (never lead
 * with a flat short synopsis).
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
