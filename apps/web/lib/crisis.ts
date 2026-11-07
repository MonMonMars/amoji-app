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

/** Real, published helplines. Rendered identically in all four languages. */
export const CRISIS_HELPLINES: Helpline[] = [
  { name: 'Samaritan Befrienders Hong Kong', tel: '2389 2222', where: 'Hong Kong' },
  { name: 'Suicide Prevention Services', tel: '2382 0000', where: 'Hong Kong' },
  { name: 'The Samaritans HK', tel: '2896 0000', where: 'Hong Kong' },
  { name: 'US 988 Suicide & Crisis Lifeline', tel: '988', where: 'United States' },
  { name: 'Japan Inochi no Denwa', tel: '0120-783-556', where: 'Japan' },
];

/** `Samaritan Befrienders Hong Kong 2389 2222 · Suicide Prevention Services …` */
export function helplineLine(): string {
  return CRISIS_HELPLINES.map((h) => `${h.name} ${h.tel}`).join(' · ');
}

interface CrisisCopy {
  /** (a) acknowledge the person, no judgement, no advice yet */
  acknowledge: string;
  /** (b) state plainly that this is not a crisis service */
  notService: string;
  /** (d) label for the link to /safety */
  safetyCta: string;
  /** heading of the in-chat card that carries the link */
  cardTitle: string;
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
  },
  yue: {
    acknowledge: '我聽到你講嘅嘢，多謝你講俾我知，我好擔心你——你唔使一個人硬撐。',
    notService: '但我只係一個 AI 同伴，唔係危機支援服務，幫唔到你保命。請你即刻搵真人傾：',
    safetyCta: '打開安全資訊頁',
    cardTitle: '請即刻搵真人傾',
  },
  zh: {
    acknowledge: '我听到你说了，谢谢你告诉我，我很担心你——你不用一个人撑着。',
    notService: '但我只是一个 AI 同伴，不是危机干预服务，保不住你的安全。请马上找真人说：',
    safetyCta: '打开安全信息页',
    cardTitle: '请马上找真人说',
  },
  ja: {
    acknowledge: '話してくれてありがとう。ちゃんと聞いたよ、すごく心配してる。ひとりで抱えなくていい。',
    notService: 'でもわたしはAIの相棒で、危機対応の窓口じゃないの。安全を守ることはできないから、いますぐ人に話してね：',
    safetyCta: '安全のページを開く',
    cardTitle: 'いますぐ人に話してね',
  },
};

export function crisisCopy(lang: Lang | string | undefined): CrisisCopy {
  return CRISIS_COPY[lang as Lang] ?? CRISIS_COPY.yue;
}

/** The full fixed reply: acknowledgement + we-are-not-a-service + numbers. */
export function crisisReplyText(lang: Lang | string | undefined): string {
  const c = crisisCopy(lang);
  return `${c.acknowledge} ${c.notService} ${helplineLine()}`;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * English. Word boundaries so "suicide" does not match inside a longer word,
 * and explicit verb forms so "kill myself" is caught but "kill time" is not.
 */
const EN_PATTERNS: RegExp[] = [
  /\bsuicid(?:e|es|al|ality)\b/i,
  /\b(?:kill|killing|killed|off)\s+my\s?self\b/i,
  /\b(?:end|ending|ended)\s+my\s+(?:own\s+)?life\b/i,
  /\btake\s+my\s+(?:own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
  /\b(?:want|wanna|wanted|wanting)\s+to\s+(?:die|be\s+dead)\b/i,
  /\bwish\s+(?:i\s+)?(?:was|were)\s+dead\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\b(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive|be\s+here\s+anymore)\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:live|living|going\s+on)\b/i,
  /\bnothing\s+to\s+live\s+for\b/i,
  /\b(?:can'?t|cannot)\s+go\s+on\s+living\b/i,
  /\bself[\s-]?harm(?:ing|ed)?\b/i,
  /\b(?:hurt|hurting|harming|cut|cutting|burn|burning)\s+my\s?self\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
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
  'リストカット', '自傷', '死のう',
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
}

/**
 * The one call every entry point makes before any brain is touched. Kept as a
 * function (not a component branch) so tests can assert the exact text and
 * that the model is skipped.
 */
export function guardCompanionTurn(text: string, lang: Lang | string | undefined): CrisisGuard {
  if (!detectCrisis(text)) return { blocked: false, reply: '' };
  return { blocked: true, reply: crisisReplyText(lang) };
}
