/**
 * Attribution for every shipped model whose licence requires credit.
 *
 * This table is the app's only credit surface. Each entry was built by reading
 * the model's OWN embedded metadata (`extensions.VRM.meta` / `VRMC_vrm.meta`),
 * not a folder README:
 *
 *  · VRM 0.x — `licenseName`, `author`, and the `credit=` parameter inside
 *    `otherPermissionUrl` (the VRoid Hub licence query string). `necessary`
 *    there means the creator requires credit.
 *  · VRM 1.0 — `creditNotation: 'required'`.
 *
 * Where the file's own author field is blank or a stub value, the creator is
 * taken from the VRoid Hub record the model was downloaded from and noted as
 * such. Two ids need that: a81 (file says "Me") and a112 (file author blank).
 *
 * `a85-kara` is the weakest of the set: the file carries `credit=necessary` but
 * an empty author. The Hub page behind it lists Kate Gipit, and crediting the
 * wrong name is the same as not crediting, so the entry names the Hub creator.
 */
import type { Lang } from './prefs';

export interface CreditEntry {
  /** Character id — matches `want-roster.json` and `CHARACTERS`. */
  id: string;
  /** Work / character name as it appears in the app. */
  work: string;
  /** Creator credit, exactly as the model or its Hub record states it. */
  by: string;
  /** Licence name, shown verbatim so a reader can look it up. */
  license: string;
  /** Canonical licence text. */
  licenseUrl: string;
  /** Where the model came from, when it is publicly citable. */
  sourceUrl?: string;
  /**
   * Extra lines the licence requires be reproduced in full. a10 is CC BY 4.0
   * with a three-part credit that has to appear as written.
   */
  extra?: readonly string[];
}

/**
 * Every model in the shipping roster whose embedded licence requires credit.
 * Anything not listed here either declares CC0 or states credit=unnecessary.
 */
export const REQUIRED_CREDITS: readonly CreditEntry[] = [
  {
    id: 'a10-agahomei-normal',
    work: '英賀保芽依 / Agaho Mei (こうしす！character 3D model)',
    by: '©京姫鉄道合同会社 · モデル制作: 佐久間蒼乃 · 原作「こうしす！」©OPAP-JP contributors',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://www.kyoki-railway.co.jp/legal/materials/kosys-character-3d.html',
    // CC BY 4.0 asks that the credit be reproducible as the licensor wrote it.
    extra: [
      '©京姫鉄道合同会社',
      'モデル制作: 佐久間蒼乃',
      '原作: 「こうしす！」©OPAP-JP contributors (https://opap.jp/contributors)',
    ],
  },
  {
    id: 'a64-lily-lily-animeit',
    work: 'Lily Lily',
    by: 'Animeit',
    license: 'VRoid Hub commercial licence (credit required)',
    licenseUrl: 'https://vroid.pixiv.help/hc/en-us/articles/360013153714',
  },
  {
    id: 'a79-amami-karasu',
    work: '天宮 鴉音 / Amami Karasu',
    by: 'harupはるぴー',
    license: 'VRM Public License 1.0 (credit required)',
    licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  },
  {
    id: 'a81-cinna',
    // The VRM's own author field says "Me"; Mushroombug is the Hub creator.
    work: 'Cinna',
    by: 'Mushroombug',
    license: 'VRM Public License 1.0 (credit required)',
    licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  },
  {
    id: 'a85-kara',
    // File has credit=necessary but a blank author; Kate Gipit is the Hub creator.
    work: 'Kara',
    by: 'Kate Gipit',
    license: 'VRoid Hub commercial licence (credit required)',
    licenseUrl: 'https://vroid.pixiv.help/hc/en-us/articles/360013153714',
  },
  {
    id: 'a98-ethan',
    // File author says "PEPE"; the Hub record this build came from lists VERA.
    work: 'ETHAN',
    by: 'VERA',
    license: 'VRM Public License 1.0 (credit required)',
    licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  },
  {
    id: 'a99-miyora',
    work: 'MIYORA',
    by: 'VERA',
    license: 'VRM Public License 1.0 (credit required)',
    licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  },
  {
    id: 'a107-dm-office-casual',
    // Three authors in the file's own authors array.
    work: 'DM Office Casual',
    by: 'Mukto · Jessair (beard) · base body pixiv VRoid Project',
    license: 'VRM Public License 1.0 (credit required)',
    licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  },
  {
    id: 'a109-riona',
    work: 'Riona',
    by: 'tyoonkigo',
    license: 'VRoid Hub commercial licence (credit required)',
    licenseUrl: 'https://vroid.pixiv.help/hc/en-us/articles/360013153714',
  },
  {
    id: 'a112-mahochan-jk',
    // File author blank; 空見みんと is the Hub creator.
    work: 'Mahochan JK',
    by: '空見みんと',
    license: 'VRoid Hub commercial licence (credit required)',
    licenseUrl: 'https://vroid.pixiv.help/hc/en-us/articles/360013153714',
  },
];

/**
 * The universal fallback avatar. Not a roster character, but it is redistributed
 * with every build, so its credit belongs on the same page.
 */
export const FALLBACK_CREDIT: CreditEntry = {
  id: 'seed-san',
  work: 'Seed-san',
  by: 'VirtualCast, Inc.',
  license: 'VRM Public License 1.0 (credit required)',
  licenseUrl: 'https://vrm.dev/en/licenses/1.0/',
  sourceUrl: 'https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san',
};

export interface CreditsDoc {
  title: string;
  intro: string;
  /** Heading above the roster model list. */
  modelsHeading: string;
  /** Heading above the fallback avatar entry. */
  fallbackHeading: string;
  /** Heading above the CC0 note. */
  cc0Heading: string;
  cc0Body: string;
  back: string;
  /** Column labels, kept out of the entry data so entries stay verbatim. */
  workLabel: string;
  byLabel: string;
  licenseLabel: string;
  sourceLabel: string;
}

export const CREDITS_COPY: Record<Lang, CreditsDoc> = {
  en: {
    title: 'Credits',
    intro:
      'Amoji ships 3D companion models made by other people. Every model below declares, inside the file itself, that credit is required when it is redistributed. The names are reproduced exactly as the creator wrote them.',
    modelsHeading: 'Companion models',
    fallbackHeading: 'Fallback avatar',
    cc0Heading: 'Models that need no credit',
    cc0Body:
      'The remaining companion models declare CC0 or state that credit is unnecessary. They are still listed in the asset manifest in the source repository, with their licence, for anyone who wants to check.',
    back: 'Back to home',
    workLabel: 'Model',
    byLabel: 'Credit',
    licenseLabel: 'Licence',
    sourceLabel: 'Source',
  },
  yue: {
    title: '鳴謝',
    intro:
      'Amoji 內置嘅 3D 夥伴模型係其他人做嘅。以下每一個模型，喺檔案本身都寫明再配布時必須標註。下面嘅名字照創作者原本嘅寫法照抄。',
    modelsHeading: '夥伴模型',
    fallbackHeading: '後備頭像',
    cc0Heading: '唔需要標註嘅模型',
    cc0Body:
      '其餘夥伴模型都係 CC0，或者寫明唔需要標註。佢哋一樣列咗喺原始碼倉庫嘅資產清單入面，連授權一齊，想查嘅人可以自己睇。',
    back: '返回主頁',
    workLabel: '模型',
    byLabel: '鳴謝',
    licenseLabel: '授權',
    sourceLabel: '來源',
  },
  zh: {
    title: '鸣谢',
    intro:
      'Amoji 内置的 3D 伙伴模型由其他人制作。以下每个模型都在文件本身写明：再分发时必须署名。下面的名字照创作者的原始写法照抄。',
    modelsHeading: '伙伴模型',
    fallbackHeading: '后备头像',
    cc0Heading: '无需署名的模型',
    cc0Body:
      '其余伙伴模型都是 CC0，或写明无需署名。它们同样列在源码仓库的资产清单里，并附上授权，想核对的人可以自己查看。',
    back: '返回首页',
    workLabel: '模型',
    byLabel: '鸣谢',
    licenseLabel: '授权',
    sourceLabel: '来源',
  },
  ja: {
    title: 'クレジット',
    intro:
      'Amoji には、他の方が制作した 3D の相棒モデルが入っています。以下のモデルはすべて、ファイル自体に「再配布時はクレジットが必要」と書かれています。名前は制作者の表記のまま掲載しています。',
    modelsHeading: '相棒モデル',
    fallbackHeading: 'フォールバックのアバター',
    cc0Heading: 'クレジット不要のモデル',
    cc0Body:
      '残りの相棒モデルは CC0 か、クレジット不要と明記されています。こちらもソースリポジトリのアセット一覧にライセンス付きで載せてあるので、確認したい方はそちらをご覧ください。',
    back: 'ホームに戻る',
    workLabel: 'モデル',
    byLabel: 'クレジット',
    licenseLabel: 'ライセンス',
    sourceLabel: '出典',
  },
};

export function creditsDoc(lang: Lang | string | undefined): CreditsDoc {
  return CREDITS_COPY[lang as Lang] ?? CREDITS_COPY.yue;
}
