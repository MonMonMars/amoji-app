// Content delivery + same-topic continuation until the user says stop.
// Recipes, how-tos, explanations, and story-style asks must teach in-turn — never
// tease. After an opening ask, later turns keep elaborating the same anchor
// until an explicit stop (停 / enough / stop talking / …).

import { recipeDishTokens } from './recipe-reply';
import { userAsksForRecipe } from './recipe-reply';
import { userWantsStory } from './story-reply';
import { wantsLongCompanionReply } from './topic-suggestions';
import { detectUserAbilityTopics } from './topic-mixture';

export type ContentContinuationSession = {
  topic: string;
  startedAt: number;
};

const CONTENT_STOP_RE =
  /(?:^|[\s，,。.!！?？])(?:stop(?:\s+talking)?|enough(?:\s+already)?|that's\s+enough|no\s+more|don't\s+(?:keep|go\s+on)|quit\s+explaining|ok\s+stop|pause\s+there|change\s+topic|talk\s+about\s+something\s+else)(?:[\s，,。.!！?？]|$)|^(?:stop|enough|停|停止|够喇|夠喇|够啦|夠啦|唔使講|唔使再講|唔好再講|唔講住|别说了|不用说了|不用说了|可以了|得啦|得喇|转话题|轉話題|换话题|換話題|やめて|もういい|止めて|続きはいい)[\s，,。.!！?？]*$/i;

const CONTENT_NUDGE_RE =
  /^(?:然後呢|然后呢|繼續|跟住|再講|再讲|讲多啲|講多啲|继续讲|繼續講|and\s+then\??|go\s+on|keep\s+going|tell\s+me\s+more|what\s+next|next\s+step|もっと|続けて|次は)(?:[\s，,。.!！?？]|$)/i;

const HOWTO_EXPLAIN_RE =
  /\b(?:how\s+(?:do\s+i|to|can\s+i)|explain|teach\s+me|tell\s+me\s+(?:how|about|why)|what\s+is|why\s+(?:is|does|do)|walk\s+me\s+through|step\s+by\s+step)\b|教我|點樣|点样|怎麼|怎么|如何|講下|讲下|解釋|解释|為什麼|为什么|點解|係咩|是什麼|介紹|介绍|原理|教えて|説明して|やり方/i;

/** User wants the companion to stop elaborating the open content thread. */
export function userSaysStopContent(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 64) return CONTENT_STOP_RE.test(t);
  return CONTENT_STOP_RE.test(t);
}

/** A turn that should open full delivery (not a teaser) on this message. */
export function userOpensContentDelivery(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (userAsksForRecipe(t)) return true;
  if (wantsLongCompanionReply(t)) return true;
  if (userWantsStory(t)) return true;
  if (HOWTO_EXPLAIN_RE.test(t)) return true;
  return false;
}

function clipTopic(raw: string, max = 48): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return 'this topic';
  return s.length <= max ? s : `${s.slice(0, max - 1).trim()}…`;
}

/** Best-effort anchor string for the ongoing thread. */
export function extractContentTopic(text: string, world?: string): string {
  const w = world?.trim() ?? '';
  if (w && /^Recipe:/m.test(w)) {
    const fromFacts = recipeDishTokens(w)[0];
    if (fromFacts) return clipTopic(fromFacts);
  }
  if (w && /^Learn:/m.test(w)) {
    const m = /^Learn:\s*([^\n.]+)/m.exec(w);
    if (m?.[1]) return clipTopic(m[1]!);
  }
  const t = text.trim();
  const recipeLead = t.match(/([\u4e00-\u9fff]{2,8})(?=食譜|食谱|做法|点煮|點煮)/);
  if (recipeLead?.[1]) return clipTopic(recipeLead[1]);
  const stripped = t
    .replace(/^(?:tell\s+me\s+(?:about\s+)?|explain\s+|teach\s+me\s+(?:how\s+to\s+)?|how\s+(?:do\s+i|to)\s+(?:make\s+)?|教我|講下|讲下|解釋|解释)\s*/i, '')
  .replace(/[?？!！。.]+$/g, '')
    .trim();
  if (stripped.length >= 2) return clipTopic(stripped);
  return clipTopic(t);
}

function normTopic(topic: string): string {
  return topic.toLowerCase().replace(/\s+/g, '').slice(0, 24);
}

function hardAbilityPivot(text: string): boolean {
  const topics = detectUserAbilityTopics(text);
  return topics.size > 0;
}

export type ContentSendResolution = {
  session: ContentContinuationSession | null;
  stopped: boolean;
  started: boolean;
  continuing: boolean;
};

/**
 * Decide how this user message affects the open content thread.
 * Pure — caller persists `session` (sessionStorage in ChatPanel).
 */
export function resolveContentContinuationOnSend(
  text: string,
  prior: ContentContinuationSession | null,
  world?: string,
): ContentSendResolution {
  const t = text.trim();
  if (!t) {
    return { session: prior, stopped: false, started: false, continuing: !!prior };
  }
  if (prior && userSaysStopContent(t)) {
    return { session: null, stopped: true, started: false, continuing: false };
  }
  if (prior && CONTENT_NUDGE_RE.test(t)) {
    return { session: prior, stopped: false, started: false, continuing: true };
  }
  if (userOpensContentDelivery(t)) {
    const topic = extractContentTopic(t, world);
    const fresh = { topic, startedAt: Date.now() };
    if (prior && normTopic(prior.topic) === normTopic(topic)) {
      return { session: fresh, stopped: false, started: false, continuing: true };
    }
    return { session: fresh, stopped: false, started: true, continuing: false };
  }
  if (prior) {
    if (hardAbilityPivot(t)) {
      return { session: null, stopped: false, started: false, continuing: false };
    }
    return { session: prior, stopped: false, started: false, continuing: true };
  }
  return { session: null, stopped: false, started: false, continuing: false };
}

/** Active continuation turn — elaborate the same anchor, answer-first, no teaser. */
export function wantsContentContinuationTurn(
  lastUser: string,
  session?: ContentContinuationSession | null,
): boolean {
  if (!session?.topic) return false;
  if (userSaysStopContent(lastUser)) return false;
  if (CONTENT_NUDGE_RE.test(lastUser.trim())) return true;
  if (hardAbilityPivot(lastUser)) return false;
  if (userOpensContentDelivery(lastUser)) {
    const topic = extractContentTopic(lastUser);
    return normTopic(topic) === normTopic(session.topic);
  }
  return true;
}

export function contentContinuationSystemBlock(language: string | undefined, session: ContentContinuationSession): string {
  const topic = session.topic;
  if (language === 'yue') {
    return `內容延續（覆蓋上面短句上限）：
- 用戶仲想聽同一個話題：「${topic}」。
- 呢句要講下一個實質段落（更多步驟、技巧、背景、例子）——唔好重複開頭，唔好問「想唔想聽」。
- 答案先行：直接教／解釋，唔好用問題代替內容。
- 用戶講停／夠喇之前，一直當同一條線講落去。`;
  }
  if (language === 'zh') {
    return `内容延续（覆盖上面的短句上限）：
- 用户还想听同一个话题：「${topic}」。
- 这一句话讲下一个实质段落（更多步骤、技巧、背景、例子）——不要重复开头，不要问「要不要听」。
- 答案先行：直接教/解释，不要用问题代替内容。
- 在用户说停/够了之前，一直沿着同一条线讲下去。`;
  }
  if (language === 'ja') {
    return `内容の続き（上の短文制限より優先）：
- 同じ話題「${topic}」を続ける。
- 次の具体パート（手順・コツ・背景・例）を話す — 聞きたい？と聞かない。
- 答えが先。質問で内容を置き換えない。
- ユーザーが止めると言うまで同じ筋で続ける。`;
  }
  return `CONTENT CONTINUATION (overrides the short-reply cap above):
- The user is still on the same thread: "${topic}".
- Deliver the NEXT substantive chunk (more steps, tips, context, examples) — do not re-introduce or ask if they want to hear it.
- Answer-first: teach or explain directly; never replace content with questions.
- Stay on this thread until they clearly say stop.`;
}

const CONTENT_TEASER_RE =
  /(?:我可以|我可以同你|我可以講|可以講|想唔想聽|想听|想聽|不如我講|要唔要|要不要|需唔需要).{0,28}(?:做法|步驟|步骤|秘訣|秘诀|解釋|解释|故事|細節|细节|詳情|详情|recipe|steps|how\s+to)|(?:want|wanna|would you like).{0,32}(?:recipe|steps|story|details|explanation|how\s+to)|(?:I can|I'll|let me)\s+(?:tell|share|give|walk|explain).{0,32}(?:recipe|steps|story|you\s+how)/i;

const DELIVERED_MARKERS =
  /(?:\d{1,2}[.)、]|第[一二三四五1-5]步)|(?:Ingredients|食材|材料)[:：]|(?:第一步|第1步)|step\s+(?:one|1)\b/i;

/** Model offered content without delivering it this turn. */
export function contentReplyIsTeaser(reply: string, userText?: string, world?: string): boolean {
  const u = userText?.trim() ?? '';
  const r = reply.trim();
  if (!r || !u) return false;
  if (!userOpensContentDelivery(u) && !/\b(?:Recipe|Learn)\s*:/m.test(world ?? '')) return false;
  if (DELIVERED_MARKERS.test(r) && r.length > 60) return false;
  if (CONTENT_TEASER_RE.test(r)) return true;
  if (r.length <= 72 && !DELIVERED_MARKERS.test(r) && userOpensContentDelivery(u)) return true;
  return false;
}

export function contentStopAck(lang?: string): string {
  if (lang === 'yue') return '好呀，呢個話題收住先。有咩想講再叫我啦。';
  if (lang === 'zh') return '好的，这个话题先到这里。你想聊别的再叫我。';
  if (lang === 'ja') return 'わかった、この話題はいったん終わりにしよう。ほかに話したくなったら言ってね。';
  return 'Okay — I’ll pause on that. Say when you want to pick it back up.';
}
