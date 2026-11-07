/**
 * Plain-language legal copy for the first-run gate, /privacy and /terms.
 *
 * Rules this file follows:
 *  · Every sentence is a shipped statement of fact — no "draft", "sample" or
 *    "not final" disclaimers anywhere, because publishing unfinished wording
 *    as policy is exactly the liability the review found.
 *  · No fake formality. Every claim here can be checked against the source:
 *    which host receives what.
 *  · Recipients are NAMED. "Third-party providers" tells a reader nothing.
 *
 * The recipients below are the ones the code actually contacts:
 *  · Pollinations  — text.pollinations.ai (keyless default brain)
 *  · OVHcloud      — oai.endpoints.kepler.ai.cloud.ovh.net (keyless racer)
 *  · Puter         — js.puter.com / puter.ai.chat (keyless racer)
 *  · Google Translate TTS — translate.google.com/translate_tts (free voice)
 *  · the user's own provider, when they paste a key in Advanced
 */
import type { Lang } from './prefs';

export interface LegalSection { heading: string; body: string[] }
export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/** Short summary used by the gate card — names the recipients up front. */
export interface LegalSummary { title: string; body: string }

export const PRIVACY_SUMMARY: Record<Lang, LegalSummary> = {
  en: {
    title: 'Privacy Policy',
    body: 'Your name, companion, scene, voice picks, memory and mood diary stay in this browser. What leaves the device is your message plus a short memory block, sent to the AI host that answers it — Pollinations, OVHcloud or Puter — or to your own provider if you pasted a key. The reply text goes to Google Translate TTS when the free voice is used. No analytics, no ad tracking.',
  },
  yue: {
    title: '私隱政策',
    body: '你嘅名、夥伴、場景、聲線選擇、記憶同日記全部留喺呢個瀏覽器。會離開呢部機嘅，係你打嘅訊息加一小段記憶，送去真正答你嘅 AI 主機——Pollinations、OVHcloud 或 Puter；如果你自己貼咗鎖匙，就送去你嗰個供應商。用免費聲線時，回覆文字會送去 Google Translate TTS。冇統計分析，冇廣告追蹤。',
  },
  zh: {
    title: '隐私政策',
    body: '你的名字、伙伴、场景、声音选择、记忆和心情日记都保存在这个浏览器里。会离开本机的是你的消息加一小段记忆，发送给真正回复你的 AI 主机——Pollinations、OVHcloud 或 Puter；如果你自己粘贴了密钥，则发送给你的服务商。使用免费声音时，回复文字会发送给 Google Translate TTS。没有统计分析，没有广告追踪。',
  },
  ja: {
    title: 'プライバシーポリシー',
    body: '名前・相棒・場所・声の選択・記憶・気分の記録は、すべてこのブラウザの中に残ります。端末の外に出るのは、あなたのメッセージと短い記憶のまとまりです。返事をするAIのホスト——Pollinations、OVHcloud、Puter——へ送られ、キーを貼り付けた場合はそのプロバイダーへ送られます。無料の声を使うときは、返事のテキストが Google Translate TTS に送られます。アクセス解析も広告トラッキングもありません。',
  },
};

export const TERMS_SUMMARY: Record<Lang, LegalSummary> = {
  en: {
    title: 'Terms of Use',
    body: 'Amoji is an AI companion for company and fun — not a doctor, therapist, lawyer, or emergency service, and not a substitute for a real person. It keeps nothing on a server of ours, and it can be wrong. If you are in crisis, please use the helplines on the safety page.',
  },
  yue: {
    title: '使用條款',
    body: 'Amoji 係陪你、同你玩嘅 AI 夥伴——唔係醫生、治療師、律師，亦都唔係緊急服務，唔可以代替真人。我哋冇伺服器保存你嘅嘢，而佢亦有可能講錯。如果你正喺危機入面，請用安全資訊頁上面嘅求助電話。',
  },
  zh: {
    title: '使用条款',
    body: 'Amoji 是陪你、陪你玩的 AI 伙伴——不是医生、治疗师、律师，也不是紧急服务，无法代替真人。我们没有服务器保存你的内容，而它也可能说错。如果你正处于危机，请使用安全信息页上的求助电话。',
  },
  ja: {
    title: '利用規約',
    body: 'Amoji は話し相手として一緒に過ごすAIの相棒です。医師・心理療法士・弁護士・緊急通報先ではなく、生身の人の代わりにもなりません。当方のサーバーには何も保存せず、まちがったことを言うこともあります。つらい状態のときは、安全のページにある相談窓口を使ってください。',
  },
};

export const PRIVACY_DOC: Record<Lang, LegalDoc> = {
  en: {
    title: 'Privacy Policy',
    intro: 'This page describes what Amoji does with your information today. It is written to be read, not to impress a lawyer.',
    sections: [
      {
        heading: 'What stays on this device',
        body: [
          'Your name, chosen companion, scene, language, volume, voice choices, mute state, the memories she keeps about you, her diary, your mood history, and the record that you accepted these terms — all of it lives in this browser\u2019s local storage.',
          'An API key you paste into Advanced is also stored only in this browser. It is sent only to the provider you chose for that provider\u2019s own API calls.',
          'The app has no account system and no server that holds your profile. Clearing site data in your browser erases everything above.',
        ],
      },
      {
        heading: 'What leaves the device, and where it goes',
        body: [
          'Chat messages. To answer you, your message plus the last few turns and a short summary of what she remembers are sent to one of the AI hosts below. Whichever host answers first is the one that received it:',
          '· Pollinations (text.pollinations.ai) — the free default host;',
          '· OVHcloud (oai.endpoints.kepler.ai.cloud.ovh.net) — a free public endpoint raced alongside it;',
          '· Puter (js.puter.com) — a free in-browser SDK that also races for the answer.',
          'If you added your own API key, your message goes to that provider instead (for example DeepSeek, Google, OpenRouter, Moonshot or GitHub Models), under that company\u2019s own privacy terms.',
          'Speech. When a free online voice is used, the reply text is sent to Google Translate TTS (translate.google.com) to produce audio. Voices built into your device are produced locally and send nothing.',
          'Weather and news. If you ask about the weather or local news, or if she offers it in a quiet moment, your city name — or your device coordinates if you allowed location — is sent to Open-Meteo (weather) and, for a place lookup, BigDataCloud or geojs.io. Headlines are fetched from public news RSS feeds and, where a feed needs it, through rss2json.com.',
          'A production API origin, if the build you are using has one configured, also receives your chat message. Builds published on GitHub Pages have none.',
        ],
      },
      {
        heading: 'What we do not do',
        body: [
          'No analytics, no advertising SDKs, no cross-site tracking, no fingerprinting, no profile built on a server, and no selling of anything you write.',
          'We do not send your message to an extra service to decide whether you are in crisis. The self-harm check runs on your device against a fixed phrase list and is never uploaded.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'Use Settings to clear chat history, forget individual memories, or wipe all memory. Clearing your browser\u2019s site data removes everything Amoji stored. Turning Voice replies off stops the TTS request; using a device voice instead of an online one sends no text.',
          'Because different companies answer different messages depending on which host responds first, the exact recipient varies per message. If that matters to you, use a key from a provider you trust, which makes that provider the one that receives your messages.',
        ],
      },
    ],
  },
  yue: {
    title: '私隱政策',
    intro: '呢頁講清楚 Amoji 今日實際點處理你嘅資料。寫得直白，係想你睇得明，唔係寫嚟氹律師。',
    sections: [
      {
        heading: '留喺呢部機嘅嘢',
        body: [
          '你嘅名、揀咗邊個夥伴、場景、語言、音量、聲線選擇、靜音狀態、佢記住你嘅事、佢嘅日記、你嘅心情紀錄，同埋你接受咗條款嘅紀錄——全部只存在呢個瀏覽器嘅本機儲存。',
          '你喺「進階」貼入去嘅 API 鎖匙，亦只存喺呢個瀏覽器，只會喺呼叫嗰個供應商嘅 API 時送去該供應商。',
          '本程式冇帳戶系統，亦冇任何伺服器保存你嘅個人檔案。你喺瀏覽器清除網站資料，以上全部都會消失。',
        ],
      },
      {
        heading: '咩會離開呢部機、去咗邊',
        body: [
          '對話訊息。為咗答你，你嘅訊息、最近幾輪對話，同一小段「佢記得嘅事」會送去下面其中一個 AI 主機；邊個先答到，就係嗰個收到：',
          '· Pollinations（text.pollinations.ai）——免費預設主機；',
          '· OVHcloud（oai.endpoints.kepler.ai.cloud.ovh.net）——同場競速嘅免費公開端點；',
          '· Puter（js.puter.com）——喺瀏覽器入面行嘅免費 SDK，一樣會競速搶答。',
          '如果你自己加咗 API 鎖匙，訊息就會送去你揀嗰個供應商（例如 DeepSeek、Google、OpenRouter、Moonshot 或 GitHub Models），受該公司自己嘅私隱條款管。',
          '語音。用免費網上聲線時，回覆文字會送去 Google Translate TTS（translate.google.com）產生音檔。用你部機本身嘅聲線就喺本機合成，唔會送出任何嘢。',
          '天氣同新聞。你問天氣或者本地新聞，或者佢喺靜嘅時候主動講，你嘅城市名（或者你批准咗定位就用座標）會送去 Open-Meteo（天氣），查地名時會經 BigDataCloud 或 geojs.io。新聞標題來自公開 RSS，部分需要經 rss2json.com 轉換。',
          '如果你用嘅版本有設定正式 API 網址，該處亦會收到你嘅對話訊息。喺 GitHub Pages 發佈嘅版本冇設定。',
        ],
      },
      {
        heading: '我哋唔會做嘅事',
        body: [
          '冇統計分析、冇廣告 SDK、冇跨網站追蹤、冇指紋辨識、冇喺伺服器建立你嘅檔案，亦都唔會賣你寫嘅任何嘢。',
          '我哋唔會為咗判斷你有冇危機，而將你嘅訊息送去額外服務。自我傷害檢查係喺你部機上面，用一份固定詞句清單比對，唔會上傳。',
        ],
      },
      {
        heading: '你嘅選擇',
        body: [
          '你可以喺設定清空對話紀錄、逐條忘記記憶，或者一次過清走全部記憶。清除瀏覽器網站資料就會刪除 Amoji 存過嘅所有嘢。關掉「語音回覆」就唔會再發 TTS 請求；改用機內聲線，就唔會送出任何文字。',
          '因為邊個主機先答到並唔固定，每條訊息實際收到嘅公司可能唔同。如果你想固定，就用一個你信得過嘅供應商嘅鎖匙，咁就只有佢會收到你嘅訊息。',
        ],
      },
    ],
  },
  zh: {
    title: '隐私政策',
    intro: '这一页说明 Amoji 目前实际如何处理你的信息。写得直白，是为了让你看懂，不是为了写给律师看。',
    sections: [
      {
        heading: '留在这台设备上的内容',
        body: [
          '你的名字、选择的伙伴、场景、语言、音量、声音选择、静音状态、她记住的关于你的事、她的日记、你的心情记录，以及你接受条款的记录——全部只保存在这个浏览器的本地存储中。',
          '你在「高级」里粘贴的 API 密钥也只保存在这个浏览器，并且只在该服务商的 API 请求中发送给该服务商。',
          '本应用没有账号系统，也没有保存你个人资料的服务器。清除浏览器的网站数据，以上内容会全部消失。',
        ],
      },
      {
        heading: '什么会离开设备、发送到哪里',
        body: [
          '聊天消息。为了回复你，你的消息、最近几轮对话以及一小段「她记得的事」会发送给下面某个 AI 主机；哪个主机先回复，就是它收到了这些内容：',
          '· Pollinations（text.pollinations.ai）——免费的默认主机；',
          '· OVHcloud（oai.endpoints.kepler.ai.cloud.ovh.net）——同时竞速的免费公开端点；',
          '· Puter（js.puter.com）——在浏览器中运行的免费 SDK，同样参与竞速。',
          '如果你添加了自己的 API 密钥，消息会发送给你选择的服务商（例如 DeepSeek、Google、OpenRouter、Moonshot 或 GitHub Models），适用该公司的隐私条款。',
          '语音。使用免费的在线声音时，回复文字会发送给 Google Translate TTS（translate.google.com）生成音频。使用设备自带的声音在本机合成，不会发送任何内容。',
          '天气与新闻。当你询问天气或本地新闻，或她在安静时主动提起，你的城市名（若你允许定位则为设备坐标）会发送给 Open-Meteo（天气）；查询地名时会经过 BigDataCloud 或 geojs.io。新闻标题来自公开 RSS，部分来源需要经 rss2json.com 转换。',
          '如果你使用的版本配置了正式 API 地址，该地址也会收到你的聊天消息。发布在 GitHub Pages 的版本没有配置。',
        ],
      },
      {
        heading: '我们不会做的事',
        body: [
          '没有统计分析、没有广告 SDK、没有跨网站追踪、没有浏览器指纹、不在服务器上建立你的档案，也不出售你写的任何内容。',
          '我们不会为了判断你是否有危机，而把你的消息发送给额外的服务。自我伤害检查在你的设备上，用固定词句清单比对，不会上传。',
        ],
      },
      {
        heading: '你的选择',
        body: [
          '你可以在设置中清空聊天记录、逐条忘记记忆，或一次清除全部记忆。清除浏览器的网站数据会删除 Amoji 保存的所有内容。关闭「语音回复」就会停止 TTS 请求；改用设备内置声音则不会发送任何文字。',
          '由于哪个主机先回复并不固定，每条消息实际收到的公司可能不同。如果你希望固定，请使用你信任的服务商的密钥，这样只有它会收到你的消息。',
        ],
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    intro: 'このページは、Amoji が今日あなたの情報をどう扱っているかをそのまま書いたものです。弁護士向けの文章ではなく、読んでわかるように書いています。',
    sections: [
      {
        heading: 'この端末に残るもの',
        body: [
          '名前、選んだ相棒、場所、言語、音量、声の選択、ミュート状態、あなたについて覚えていること、彼女の日記、気分の記録、規約に同意した記録——すべてこのブラウザのローカルストレージにあります。',
          '「詳細設定」で貼り付けたAPIキーもこのブラウザだけに保存され、そのプロバイダーのAPIを呼ぶときだけ、そのプロバイダーへ送られます。',
          'アカウントの仕組みはなく、あなたのプロフィールを保持するサーバーもありません。ブラウザでサイトデータを消去すれば、上記はすべて消えます。',
        ],
      },
      {
        heading: '端末の外に出るもの、その行き先',
        body: [
          'チャットのメッセージ。返事をするために、あなたのメッセージ、直近数ターン、そして「覚えていること」の短いまとまりが、下のいずれかのAIホストへ送られます。先に返事をしたホストが、それを受け取ったホストです。',
          '· Pollinations（text.pollinations.ai）— 無料の標準ホスト。',
          '· OVHcloud（oai.endpoints.kepler.ai.cloud.ovh.net）— 同時に競争する無料の公開エンドポイント。',
          '· Puter（js.puter.com）— ブラウザ内で動く無料SDK。これも競争に加わります。',
          'APIキーを自分で追加した場合は、選んだプロバイダー（DeepSeek、Google、OpenRouter、Moonshot、GitHub Models など）へ送られ、その会社のプライバシー条件に従います。',
          '音声。無料のオンライン音声を使うときは、返事のテキストが Google Translate TTS（translate.google.com）に送られて音声になります。端末に内蔵された声は端末内で合成され、何も送りません。',
          '天気とニュース。天気や地域のニュースを尋ねたとき、または静かな時間に彼女から話題にしたとき、都市名（位置情報を許可した場合は端末の座標）が Open-Meteo（天気）へ、地名の検索では BigDataCloud または geojs.io へ送られます。見出しは公開RSSから取得し、必要な場合は rss2json.com を経由します。',
          '使用中のビルドに本番APIのURLが設定されている場合、そこにもチャットのメッセージが届きます。GitHub Pages で公開しているビルドには設定されていません。',
        ],
      },
      {
        heading: 'しないこと',
        body: [
          'アクセス解析、広告SDK、サイトをまたぐトラッキング、フィンガープリント、サーバー上のプロファイル作成、あなたが書いた内容の販売——いずれも行いません。',
          '危機にあるかどうかを判断するために、メッセージを別のサービスへ送ることはしません。自傷に関する確認は端末内で固定の語句リストと照合するだけで、アップロードしません。',
        ],
      },
      {
        heading: 'あなたが選べること',
        body: [
          '設定から会話履歴の消去、記憶をひとつずつ忘れる、記憶をすべて消す、ができます。ブラウザのサイトデータを消去すれば、Amoji が保存したものはすべて消えます。「音声返答」をオフにすればTTSのリクエストは送られません。オンライン音声ではなく端末内蔵の声にすれば、テキストは送られません。',
          'どのホストが先に返事をするかは固定ではないため、実際の送り先はメッセージごとに変わります。固定したい場合は、信頼できるプロバイダーのキーを使ってください。そのプロバイダーだけがメッセージを受け取ります。',
        ],
      },
    ],
  },
};

export const TERMS_DOC: Record<Lang, LegalDoc> = {
  en: {
    title: 'Terms of Use',
    intro: 'Short, plain terms for using Amoji. They describe how the app actually behaves.',
    sections: [
      {
        heading: 'What Amoji is',
        body: [
          'Amoji is an AI companion: a 3D character whose spoken replies are generated by a language model. It is made for company, comfort and play.',
          'It is not a human, not a therapist, not a doctor, not a lawyer, not a financial adviser, and not an emergency service. Nothing it says is medical, legal, or financial advice, and no reply should be relied on for a decision that matters.',
        ],
      },
      {
        heading: 'Crisis and self-harm',
        body: [
          'Amoji is not able to help in a crisis. If you write something about suicide or self-harm, the app stops the model and shows a fixed safety message with real helpline numbers. That message is a signpost, not an assessment, and it is not counselling.',
          'If you or someone else is in immediate danger, contact your local emergency number. The helplines are listed on the safety page.',
        ],
      },
      {
        heading: 'Accuracy',
        body: [
          'Language models produce plausible text, not verified fact. Replies can be wrong, out of date, or invented, including about people, places, health, prices and news. Live weather and headlines come from public feeds and can lag or fail.',
          'Use your own judgement. Check anything important somewhere else.',
        ],
      },
      {
        heading: 'Your responsibilities',
        body: [
          'You are responsible for what you type, for the API keys you paste in (including any cost they incur with that provider), and for how you use what the app produces.',
          'Do not use Amoji to harass anyone, to impersonate a real person, to produce illegal content, or to make decisions about another person\u2019s health, safety or money.',
          'If you are under the age of majority where you live, use Amoji with a parent or guardian\u2019s agreement. Kid mode limits the cast, scenes and tone but is not a substitute for supervision.',
        ],
      },
      {
        heading: 'Availability and change',
        body: [
          'The free AI hosts are run by other companies (Pollinations, OVHcloud, Puter, and Google for the free voice). They can be slow, rate-limited, or withdrawn without notice, and the app falls back to shorter local replies when they are unavailable. Features may change.',
          'No warranty is given and no service level is promised. To the extent the law allows, the project is not liable for losses arising from use of the app; nothing here limits rights you have under mandatory consumer law.',
        ],
      },
      {
        heading: 'Where your data goes',
        body: [
          'See the privacy policy: it names every recipient and says exactly what is sent to each. Chat content leaves the device to an AI host chosen at reply time, and reply text goes to Google Translate TTS when the free online voice is used.',
        ],
      },
    ],
  },
  yue: {
    title: '使用條款',
    intro: '簡短、直白咁講清楚用 Amoji 有咩規矩，同埋佢實際係點運作。',
    sections: [
      {
        heading: 'Amoji 係咩',
        body: [
          'Amoji 係一個 AI 夥伴：一個 3D 角色，佢講嘅說話由語言模型生成。做出嚟係為咗陪你、令你舒服、同你一齊玩。',
          '佢唔係真人，唔係治療師、醫生、律師、理財顧問，亦都唔係緊急服務。佢講嘅嘢唔構成醫療、法律或者財務建議，亦都唔應該憑佢一句話去決定重要嘅事。',
        ],
      },
      {
        heading: '危機同自我傷害',
        body: [
          'Amoji 幫唔到危機入面嘅情況。如果你寫嘅嘢涉及自殺或者自殘，程式會停用模型，改為顯示一段固定嘅安全訊息，連埋真實求助電話。呢段訊息係指路牌，唔係風險評估，亦都唔係輔導。',
          '如果你或者其他人而家即刻有危險，請打當地嘅緊急電話。求助熱線列喺安全資訊頁。',
        ],
      },
      {
        heading: '準確度',
        body: [
          '語言模型會寫出似層層嘅文字，但唔係核實過嘅事實。回覆可能出錯、過時，甚至完全虛構，包括關於人物、地方、健康、價錢同新聞嘅內容。即時天氣同新聞標題來自公開來源，可能延遲或者失敗。',
          '請你自己判斷。重要嘅事，去第二度核實。',
        ],
      },
      {
        heading: '你嘅責任',
        body: [
          '你要為自己打嘅內容負責，亦要為你貼入去嘅 API 鎖匙負責（包括該供應商因此收取嘅費用），以及為你點使用程式產生嘅內容負責。',
          '唔好用 Amoji 去騷擾人、冒充真人、製作違法內容，或者用來決定別人嘅健康、安全或者金錢事宜。',
          '如果你未達所在地嘅成年年齡，請喺家長或者監護人同意下使用。兒童模式會限制角色、場景同語氣，但唔可以代替大人看管。',
        ],
      },
      {
        heading: '可用性同變更',
        body: [
          '免費 AI 主機由其他公司營運（Pollinations、OVHcloud、Puter，免費聲線就係 Google）。佢哋可能好慢、有次數限制，或者隨時停止服務；唔可用嘅時候，程式會改用較短嘅本機回覆。功能亦可能會變。',
          '本程式唔提供任何保證，亦唔承諾任何服務水平。喺法律容許嘅範圍內，本專案唔會就用咗呢個程式而引致嘅損失負責；呢段唔會限制你喺強制性消費者法例下嘅權利。',
        ],
      },
      {
        heading: '你嘅資料去咗邊',
        body: [
          '請睇私隱政策：裏面逐個列出收到資料嘅公司，同埋各自確實收到咩。對話內容會離開呢部機，送去回覆時揀中嘅 AI 主機；用免費網上聲線時，回覆文字會送去 Google Translate TTS。',
        ],
      },
    ],
  },
  zh: {
    title: '使用条款',
    intro: '简短、直白地说明使用 Amoji 的规则，以及它实际如何运作。',
    sections: [
      {
        heading: 'Amoji 是什么',
        body: [
          'Amoji 是一个 AI 伙伴：一个 3D 角色，她说的话由语言模型生成。它的用途是陪伴、安慰和陪你玩。',
          '她不是真人，不是治疗师、医生、律师、理财顾问，也不是紧急服务。她说的话不构成医疗、法律或财务建议，也不应仅凭她的一句话去决定重要的事。',
        ],
      },
      {
        heading: '危机与自我伤害',
        body: [
          'Amoji 无法应对危机。如果你写下涉及自杀或自残的内容，应用会停用模型，改为显示一段固定的安全提示，并附上真实的求助电话。那段提示是指路牌，不是风险评估，也不是心理咨询。',
          '如果你或他人正面临立即危险，请拨打当地的紧急电话。求助热线列在安全信息页。',
        ],
      },
      {
        heading: '准确性',
        body: [
          '语言模型会生成看起来合理的文字，但不是经过核实的事实。回复可能出错、过时甚至完全虚构，包括关于人物、地点、健康、价格和新闻的内容。实时天气与新闻标题来自公开来源，可能延迟或失败。',
          '请你自己判断。重要的事，请到别处核实。',
        ],
      },
      {
        heading: '你的责任',
        body: [
          '你需要为自己输入的内容负责，为你粘贴的 API 密钥负责（包括该服务商因此产生的费用），以及为你如何使用应用生成的内容负责。',
          '不要用 Amoji 骚扰他人、冒充真人、制作违法内容，或用来决定他人的健康、安全或金钱事务。',
          '如果你未达到所在地的成年年龄，请在父母或监护人同意下使用。儿童模式会限制角色、场景和语气，但不能代替大人的看护。',
        ],
      },
      {
        heading: '可用性与变更',
        body: [
          '免费的 AI 主机由其他公司运营（Pollinations、OVHcloud、Puter，免费声音则由 Google 提供）。它们可能很慢、有次数限制，或随时停止服务；不可用时，应用会改用较短的本地回复。功能也可能改变。',
          '本应用不提供任何保证，也不承诺任何服务水平。在法律允许的范围内，本项目不对因使用本应用而产生的损失负责；本段不限制你在强制性消费者法律下的权利。',
        ],
      },
      {
        heading: '你的数据去哪里',
        body: [
          '请见隐私政策：其中逐一列出接收方，并说明各自具体收到什么。对话内容会离开本机，发送给回复时选中的 AI 主机；使用免费在线声音时，回复文字会发送给 Google Translate TTS。',
        ],
      },
    ],
  },
  ja: {
    title: '利用規約',
    intro: 'Amoji を使うときの決まりごとと、実際の動きを短くそのまま書いたものです。',
    sections: [
      {
        heading: 'Amoji とは',
        body: [
          'Amoji はAIの相棒です。3Dキャラクターで、話す返事は言語モデルが生成しています。一緒に過ごすため、気持ちを休めるため、遊ぶためのアプリです。',
          '人間ではなく、心理療法士・医師・弁護士・金融アドバイザー・緊急通報先でもありません。返事は医療・法律・金融の助言ではなく、大事な判断をそれだけに委ねるべきものではありません。',
        ],
      },
      {
        heading: '危機と自傷',
        body: [
          'Amoji は危機に対応できません。自殺や自傷について書いた場合、アプリはモデルを止め、実際の相談窓口の番号を含む決まった安全のお知らせを表示します。それは道しるべであり、リスク評価でもカウンセリングでもありません。',
          'あなたや誰かが今すぐ危険な状態なら、お住まいの地域の緊急番号へ連絡してください。相談窓口は安全のページにあります。',
        ],
      },
      {
        heading: '正確さ',
        body: [
          '言語モデルはもっともらしい文章を作りますが、確認された事実ではありません。人物・場所・健康・価格・ニュースについて、誤り・古い情報・まったくの作り話が含まれることがあります。リアルタイムの天気と見出しは公開ソースから取得しており、遅れたり失敗したりします。',
          'ご自身で判断してください。大切なことは別の場所で確認を。',
        ],
      },
      {
        heading: 'あなたの責任',
        body: [
          '入力する内容、貼り付けるAPIキー（そのプロバイダーで発生する料金を含む）、そしてアプリが生成したものをどう使うかは、あなたの責任です。',
          '誰かへの嫌がらせ、実在の人物のなりすまし、違法な内容の作成、他者の健康・安全・お金に関する判断のために使わないでください。',
          'お住まいの地域で成年に達していない場合は、保護者の同意を得て使ってください。キッズモードはキャラクター・場所・口調を制限しますが、見守りの代わりにはなりません。',
        ],
      },
      {
        heading: '提供状況と変更',
        body: [
          '無料のAIホストは他社（Pollinations、OVHcloud、Puter、無料音声は Google）が運営しています。遅いとき、回数制限、予告なく停止することがあり、使えないときは短い端末内の返事に切り替わります。機能は変更されることがあります。',
          '保証も、サービス水準の約束もありません。法律が認める範囲で、本プロジェクトはアプリの利用から生じた損失に責任を負いません。この文章は、強行法規である消費者法上のあなたの権利を制限するものではありません。',
        ],
      },
      {
        heading: 'データの行き先',
        body: [
          'プライバシーポリシーをご覧ください。受け取る相手をすべて挙げ、それぞれに何が送られるかを書いています。会話の内容は返事の時点で選ばれたAIホストへ端末の外に出て、無料のオンライン音声を使うときは返事のテキストが Google Translate TTS へ送られます。',
        ],
      },
    ],
  },
};

export function privacyDoc(lang: Lang | string | undefined): LegalDoc {
  return PRIVACY_DOC[lang as Lang] ?? PRIVACY_DOC.yue;
}
export function termsDoc(lang: Lang | string | undefined): LegalDoc {
  return TERMS_DOC[lang as Lang] ?? TERMS_DOC.yue;
}
export function privacySummary(lang: Lang | string | undefined): LegalSummary {
  return PRIVACY_SUMMARY[lang as Lang] ?? PRIVACY_SUMMARY.yue;
}
export function termsSummary(lang: Lang | string | undefined): LegalSummary {
  return TERMS_SUMMARY[lang as Lang] ?? TERMS_SUMMARY.yue;
}
