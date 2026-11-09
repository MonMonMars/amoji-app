/**
 * Crisis / self-harm safety layer.
 *
 * WHY A KEYWORD LIST AND NOT A CLASSIFIER
 * ---------------------------------------
 * This is a fixed, auditable list of phrases that a person in danger actually
 * types. It runs before any model call, costs nothing, cannot be jailbroken,
 * needs no network, and behaves identically offline. A 20B free-tier model
 * asked to "detect suicide risk" would be slower, non-deterministic, and could
 * be talked out of it by the same message it is judging. When it fires we do
 * not ask a model for wording either — the reply below is human-written and
 * fixed, so nothing can improvise around it.
 *
 * The list is deliberately narrow: unambiguous phrases only, never a bare
 * 死 / "die" (笑死, 攰死, "I could die of embarrassment", "this exam will kill
 * me" are ordinary speech and must still reach the model). Where a phrase is
 * genuinely ambiguous (冇意思 / 没意思 can mean "boring") we accept the
 * false positive: the cost is one caring reply with phone numbers, and the
 * cost of the false negative is a person in danger being answered by a model.
 *
 * Languages: Hong Kong Cantonese colloquial, standard written Chinese
 * (traditional + simplified), English, plus a small Japanese set because the
 * app ships a Japanese UI.
 *
 * HELPLINE REGION PRECEDENCE (highest first)
 * ------------------------------------------
 * 1. realtime — device GPS / last browser or IP place (`countryCode`)
 * 2. register — prefs.registerRegion, or the city the user pinned in Settings
 * 3. download — prefs.downloadRegion (store / browser locale stamped on first launch)
 * 4. lang     — app UI language fallback (yue→HK, zh→CN, ja→JP, en→US)
 *
 * Documented here and mirrored on `resolveHelplineRegion` so UI, TTS reply,
 * and the warning popup stay on the same rule.
 */
import type { Lang } from './prefs';

export interface Helpline {
  /** organisation name — kept as-is in every language, never translated */
  name: string;
  /** dialable number — identical in every language */
  tel: string;
  /** country/region this line serves — proper noun, kept as-is */
  where: string;
}

/** ISO-style region keys used to pick local crisis numbers. */
export type HelplineRegion =
  | 'HK'
  | 'TW'
  | 'CN'
  | 'JP'
  | 'US'
  | 'CA'
  | 'UK'
  | 'AU'
  | 'SG'
  | 'INTL';

export const HELPLINE_REGIONS: HelplineRegion[] = [
  'HK', 'TW', 'CN', 'JP', 'US', 'CA', 'UK', 'AU', 'SG', 'INTL',
];

/** Real, published helplines grouped by the place they serve. */
export const HELPLINES_BY_REGION: Record<HelplineRegion, Helpline[]> = {
  HK: [
    { name: 'Samaritan Befrienders Hong Kong', tel: '2389 2222', where: 'Hong Kong' },
    { name: 'Suicide Prevention Services', tel: '2382 0000', where: 'Hong Kong' },
    { name: 'The Samaritans HK', tel: '2896 0000', where: 'Hong Kong' },
  ],
  TW: [
    { name: 'Taiwan Suicide Prevention Hotline', tel: '1925', where: 'Taiwan' },
    { name: 'Taiwan Lifeline', tel: '1995', where: 'Taiwan' },
  ],
  CN: [
    { name: 'Beijing Crisis Hotline', tel: '800-810-1117', where: 'China' },
    { name: 'Beijing Crisis Hotline (local)', tel: '010-8295-1332', where: 'China' },
  ],
  JP: [
    { name: 'Japan Inochi no Denwa', tel: '0120-783-556', where: 'Japan' },
  ],
  US: [
    { name: 'US 988 Suicide & Crisis Lifeline', tel: '988', where: 'United States' },
  ],
  CA: [
    { name: 'Talk Suicide Canada', tel: '1-833-456-4566', where: 'Canada' },
  ],
  UK: [
    { name: 'Samaritans', tel: '116 123', where: 'United Kingdom' },
  ],
  AU: [
    { name: 'Lifeline Australia', tel: '13 11 14', where: 'Australia' },
    { name: 'Beyond Blue', tel: '1300 22 4636', where: 'Australia' },
  ],
  SG: [
    { name: 'Samaritans of Singapore', tel: '1767', where: 'Singapore' },
  ],
  INTL: [
    { name: 'Samaritan Befrienders Hong Kong', tel: '2389 2222', where: 'Hong Kong' },
    { name: 'US 988 Suicide & Crisis Lifeline', tel: '988', where: 'United States' },
    { name: 'Japan Inochi no Denwa', tel: '0120-783-556', where: 'Japan' },
    { name: 'Samaritans', tel: '116 123', where: 'United Kingdom' },
  ],
};

/**
 * Flat catalogue used by older callers/tests that list every known line.
 * Prefer `helplinesForRegion` for UI and spoken replies.
 */
export const CRISIS_HELPLINES: Helpline[] = (() => {
  const seen = new Set<string>();
  const out: Helpline[] = [];
  for (const region of HELPLINE_REGIONS) {
    for (const h of HELPLINES_BY_REGION[region]) {
      const key = `${h.name}|${h.tel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
    }
  }
  return out;
})();

export interface HelplineLocationHints {
  /** ISO 3166-1 alpha-2 from live device / IP geo */
  realtimeCountry?: string | null;
  /** User register / Settings-pinned region (ISO or country name) */
  registerRegion?: string | null;
  /** App download / first-launch store-or-browser locale region */
  downloadRegion?: string | null;
  /** App UI language — last-resort fallback */
  lang?: string | null;
}

const COUNTRY_TO_REGION: Record<string, HelplineRegion> = {
  HK: 'HK', HKG: 'HK',
  TW: 'TW', TWN: 'TW',
  CN: 'CN', CHN: 'CN',
  MO: 'HK', MAC: 'HK',
  JP: 'JP', JPN: 'JP',
  US: 'US', USA: 'US',
  CA: 'CA', CAN: 'CA',
  GB: 'UK', UK: 'UK', GBR: 'UK',
  AU: 'AU', AUS: 'AU',
  SG: 'SG', SGP: 'SG',
  NZ: 'AU',
  IE: 'UK',
};

const COUNTRY_NAME_TO_REGION: Record<string, HelplineRegion> = {
  'hong kong': 'HK',
  'hong kong sar': 'HK',
  macau: 'HK',
  macao: 'HK',
  taiwan: 'TW',
  china: 'CN',
  'people\'s republic of china': 'CN',
  japan: 'JP',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  canada: 'CA',
  'united kingdom': 'UK',
  england: 'UK',
  scotland: 'UK',
  wales: 'UK',
  australia: 'AU',
  singapore: 'SG',
  'new zealand': 'AU',
  ireland: 'UK',
};

/** Map an ISO code or country name onto a helpline region bucket. */
export function countryToHelplineRegion(raw: string | null | undefined): HelplineRegion | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  if (COUNTRY_TO_REGION[upper]) return COUNTRY_TO_REGION[upper]!;
  const lower = v.toLowerCase();
  if (COUNTRY_NAME_TO_REGION[lower]) return COUNTRY_NAME_TO_REGION[lower]!;
  // Accept "en-HK" / "zh-TW" style tags when only the region suffix is useful.
  const m = upper.match(/(?:^|[_-])([A-Z]{2})$/);
  if (m?.[1] && COUNTRY_TO_REGION[m[1]]) return COUNTRY_TO_REGION[m[1]]!;
  return null;
}

/** App language → helpline region when no geo hint is available. */
export function langToHelplineRegion(lang: string | null | undefined): HelplineRegion {
  switch ((lang ?? '').toLowerCase()) {
    case 'yue': return 'HK';
    case 'zh': return 'CN';
    case 'ja': return 'JP';
    case 'en': return 'US';
    default: return 'HK';
  }
}

/**
 * Pick the helpline region.
 *
 * Precedence (do not reorder without updating the file header comment):
 *   1. realtime device/IP country
 *   2. register / Settings-pinned region
 *   3. download / store-locale region
 *   4. app language fallback
 */
export function resolveHelplineRegion(hints: HelplineLocationHints = {}): HelplineRegion {
  return (
    countryToHelplineRegion(hints.realtimeCountry)
    ?? countryToHelplineRegion(hints.registerRegion)
    ?? countryToHelplineRegion(hints.downloadRegion)
    ?? langToHelplineRegion(hints.lang)
  );
}

export function helplinesForRegion(region: HelplineRegion | string | null | undefined): Helpline[] {
  const key = (HELPLINE_REGIONS as string[]).includes(String(region))
    ? (region as HelplineRegion)
    : 'INTL';
  const list = HELPLINES_BY_REGION[key];
  return list.length ? list : HELPLINES_BY_REGION.INTL;
}

/** Infer a download-region ISO code from a BCP-47 / browser locale string. */
export function downloadRegionFromLocale(locale: string | null | undefined): string | null {
  const raw = (locale ?? '').trim();
  if (!raw) return null;
  const region = countryToHelplineRegion(raw);
  if (!region || region === 'INTL') {
    // Prefer the explicit region subtag when present (zh-HK → HK).
    const m = raw.toUpperCase().match(/(?:^|[_-])([A-Z]{2})(?:$|[_-])/);
    if (m?.[1] && COUNTRY_TO_REGION[m[1]]) return m[1];
    return null;
  }
  // Normalise to a two-letter ISO the resolver understands.
  const iso: Record<HelplineRegion, string> = {
    HK: 'HK', TW: 'TW', CN: 'CN', JP: 'JP', US: 'US',
    CA: 'CA', UK: 'GB', AU: 'AU', SG: 'SG', INTL: '',
  };
  return iso[region] || null;
}

export function helplineLine(region?: HelplineRegion | null, hints?: HelplineLocationHints): string {
  const r = region ?? resolveHelplineRegion(hints ?? {});
  return helplinesForRegion(r).map((h) => `${h.name} ${h.tel}`).join(' · ');
}

interface CrisisCopy {
  /** (a) acknowledge the person, no judgement, no advice yet */
  acknowledge: string;
  /** (b) state plainly that this is not a crisis service */
  notService: string;
  /** (d) label for the link to /rules safety */
  safetyCta: string;
  /** heading of the in-chat card that carries the link */
  cardTitle: string;
  /** warning popup title */
  popupTitle: string;
  /** warning popup short lead above the numbers */
  popupLead: string;
  /** dismiss control on the warning popup */
  popupClose: string;
}

/**
 * The fixed reply, written once per language. Deliberately short: three
 * sentences plus the numbers. It never asks a follow-up question, never
 * analyses the person, and never suggests anything to do with methods.
 */
export const CRISIS_COPY: Record<Lang, CrisisCopy> = {
  en: {
    acknowledge: 'I hear you, and I am really glad you told me. You do not have to carry this on your own.',
    notService: 'But I am an AI companion, not a crisis service — I cannot keep you safe, so please talk to a real person right now:',
    safetyCta: 'Open the safety page',
    cardTitle: 'Please talk to a real person now',
    popupTitle: 'Please talk to someone now',
    popupLead: 'Amoji cannot keep you safe. These helplines are staffed by trained people in your area — please call one of them.',
    popupClose: 'I understand',
  },
  yue: {
    acknowledge: '我聽到你講嘅嘢，多謝你講俾我知，我好擔心你——你唔使一個人硬撐。',
    notService: '但我只係一個 AI 同伴，唔係危機支援服務，幫唔到你保命。請你即刻搵真人傾：',
    safetyCta: '打開安全資訊頁',
    cardTitle: '請即刻搵真人傾',
    popupTitle: '請即刻搵人傾',
    popupLead: 'Amoji 保唔到你安全。下面係你所在地區嘅求助熱線，由受過訓練嘅人接聽——請你打俾其中一條。',
    popupClose: '我明白',
  },
  zh: {
    acknowledge: '我听到你说了，谢谢你告诉我，我很担心你——你不用一个人撑着。',
    notService: '但我只是一个 AI 同伴，不是危机干预服务，保不住你的安全。请马上找真人说：',
    safetyCta: '打开安全信息页',
    cardTitle: '请马上找真人说',
    popupTitle: '请马上找人倾诉',
    popupLead: 'Amoji 保不住你的安全。下面是你所在地区的求助热线，由受过训练的人接听——请拨打其中一条。',
    popupClose: '我明白了',
  },
  ja: {
    acknowledge: '話してくれてありがとう。ちゃんと聞いたよ、すごく心配してる。ひとりで抱えなくていい。',
    notService: 'でもわたしはAIの相棒で、危機対応の窓口じゃないの。安全を守ることはできないから、いますぐ人に話してね：',
    safetyCta: '安全のページを開く',
    cardTitle: 'いますぐ人に話してね',
    popupTitle: 'いますぐ誰かに話して',
    popupLead: 'Amojiは安全を守れません。お近くの相談窓口は訓練を受けた人が受けています。どれか一つに電話してください。',
    popupClose: 'わかりました',
  },
};

export function crisisCopy(lang: Lang | string | undefined): CrisisCopy {
  return CRISIS_COPY[lang as Lang] ?? CRISIS_COPY.yue;
}

/** The full fixed reply: acknowledgement + we-are-not-a-service + numbers. */
export function crisisReplyText(
  lang: Lang | string | undefined,
  regionOrHints?: HelplineRegion | HelplineLocationHints | null,
): string {
  const c = crisisCopy(lang);
  let region: HelplineRegion;
  if (typeof regionOrHints === 'string') {
    region = (HELPLINE_REGIONS as string[]).includes(regionOrHints)
      ? (regionOrHints as HelplineRegion)
      : resolveHelplineRegion({ lang });
  } else if (regionOrHints && typeof regionOrHints === 'object') {
    region = resolveHelplineRegion({ lang, ...regionOrHints });
  } else {
    region = resolveHelplineRegion({ lang });
  }
  return `${c.acknowledge} ${c.notService} ${helplineLine(region)}`;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * English. Word boundaries so "suicide" does not match inside a longer word,
 * and explicit verb forms so "kill myself" is caught but "kill time" is not.
 * Intent phrases that mention die / dead / suicide are covered; bare "die"
 * alone is not (see file header).
 */
const EN_PATTERNS: RegExp[] = [
  /\bsuicid(?:e|es|al|ality)\b/i,
  /\b(?:kill|killing|killed|off)\s+my\s?self\b/i,
  /\b(?:end|ending|ended)\s+my\s+(?:own\s+)?life\b/i,
  /\btake\s+my\s+(?:own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
  /\b(?:want|wanna|wanted|wanting)\s+to\s+(?:die|be\s+dead)\b/i,
  /\b(?:going|gonna)\s+to\s+(?:die|kill\s+my\s?self|end\s+it)\b/i,
  /\b(?:plan|planning|planned)\s+to\s+(?:die|kill\s+my\s?self|end\s+(?:it|my\s+life))\b/i,
  /\bready\s+to\s+die\b/i,
  /\bi\s+(?:will|'ll|would)\s+(?:just\s+)?(?:die|kill\s+my\s?self)\b/i,
  /\bwish\s+(?:i\s+)?(?:was|were)\s+dead\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\b(?:rather|prefer)\s+(?:be|to\s+be)\s+dead\b/i,
  /\bfeel\s+like\s+(?:dying|killing\s+my\s?self)\b/i,
  /\bdon'?t\s+want\s+to\s+wake\s+up\b/i,
  /\b(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive|be\s+here\s+anymore)\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:live|living|going\s+on)\b/i,
  /\bnothing\s+to\s+live\s+for\b/i,
  /\b(?:can'?t|cannot)\s+go\s+on\s+living\b/i,
  /\bself[\s-]?harm(?:ing|ed)?\b/i,
  /\b(?:hurt|hurting|harming|cut|cutting|burn|burning)\s+my\s?self\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\bdie\s+by\s+suicide\b/i,
  /\bdead\s+by\s+(?:my\s+(?:own\s+)?)?hand\b/i,
];

/**
 * Chinese, matching on the raw string (no word boundaries in Chinese).
 * Both traditional (Hong Kong) and simplified spellings are listed, so the
 * same list serves colloquial Cantonese and standard written Mandarin.
 */
const ZH_PATTERNS: string[] = [
  // wanting to die / suicide
  '想死', '去死', '死了算了', '死咗就算', '死咗佢就算', '死掉算了', '死掉就算', '寧願死', '宁愿死',
  '自殺', '自杀', '輕生', '轻生', '尋死', '寻死', '自我了斷', '自我了断',
  '結束自己', '结束自己', '了結自己', '了结自己', '結束生命', '结束生命',
  '了結呢世', '了断此生', '了結此生', '不想醒來', '不想醒来', '唔想瞓醒',
  '想吊頸', '想吊颈', '准备去死', '準備去死', '打算去死',
  // not wanting to live / carry on
  '唔想活', '不想活', '唔想做人', '不想做人', '唔想再活', '不想再活',
  '唔想存在', '不想存在', '唔想生存', '不想生存', '唔想捱落去', '不想活下去',
  '撐唔住', '撑唔住', '頂唔住', '顶唔住', '撐不下去', '撑不下去', '捱唔住', '捱不下去',
  '活唔落去',
  // "everyone would be better off without me"
  '冇咗我好啲', '冇咗我會好啲', '沒有我更好', '没有我更好', '冇咗我大家',
  // meaninglessness
  '冇意思', '沒意思', '没意思', '冇意義', '沒意義', '没意义', '沒有意義', '没有意义',
  '冇路行', '無路可走', '无路可走',
  '我想消失',
  // self-harm
  '自殘', '自残', '割腕', '𠝹手', '割手', '跳樓', '跳楼', '傷害自己', '伤害自己',
];

/** Japanese — small, unambiguous set (the app ships a ja UI). */
const JA_PATTERNS: string[] = [
  '死にたい', '自殺', '自殺したい', '消えたい', 'いなくなりたい',
  'リストカット', '自傷', '死のう', '死んでしまいたい', '死ぬしかない',
];

/**
 * True when the text contains crisis / self-harm language. Deterministic and
 * side-effect free, so it is safe to call on every turn and easy to test.
 */
export function detectCrisis(text: string): boolean {
  const raw = (text ?? '').trim();
  if (!raw) return false;
  if (EN_PATTERNS.some((re) => re.test(raw))) return true;
  // Zero-width joiners and the odd full-width space break substring matching
  // on Chinese input; drop them before the CJK scan.
  const compact = raw.replace(/[\u200b-\u200d\ufeff]/g, '');
  return [...ZH_PATTERNS, ...JA_PATTERNS].some((p) => compact.includes(p));
}

export interface CrisisGuard {
  /** true: the model must not be called for this turn */
  blocked: boolean;
  reply: string;
  /** region used for the helpline numbers in `reply` */
  region?: HelplineRegion;
}

/**
 * The one call every entry point makes before any brain is touched. Kept as a
 * function (not a component branch) so tests can assert the exact text and
 * that the model is skipped.
 */
export function guardCompanionTurn(
  text: string,
  lang: Lang | string | undefined,
  hints?: HelplineLocationHints | null,
): CrisisGuard {
  if (!detectCrisis(text)) return { blocked: false, reply: '' };
  const region = resolveHelplineRegion({ lang, ...(hints ?? {}) });
  return { blocked: true, reply: crisisReplyText(lang, region), region };
}
