// Turn a raw model reply into something a companion can actually say.
// Reasoning models leak plans ("the user wants…", channel tags, an unfinished
// tail). Personality stays: laughs, pauses, and a real question are kept.
// Running this twice is a no-op on text it already cleaned.

import { polishCantoneseReply } from './cantonese-quality';
import { stripLaughTokens } from './speak-text';

export interface ShapeOpts {
  /** A stream is still growing, so an unfinished last clause stays. */
  streaming?: boolean;
  /** A cook-along or a lesson: the 1–3 sentence cap does not apply. */
  detailed?: boolean;
  /** The live-facts block this turn was built from (see worldBlock). A turn
   *  that asked for the weather, a headline, or a place is allowed to run
   *  long, because it is answering with the facts the user wanted. */
  world?: string;
  /** Selected UI language — tightens the spoken budget for yue (DimDik ~40). */
  language?: string;
}

// ---------------------------------------------------------------------------
// Spoken-length budget.
//
// The user's complaint was "too long, says nonsense". A prompt alone cannot
// hold a free 20B model to a length, so the budget is enforced here, in code,
// before the text reaches the bubble or the synthesizer. The unit is
// characters with whitespace ignored, because that is what a voice actually
// spends time on. CJK carries far more meaning per glyph, so one reply lands
// near 3 short spoken sentences at roughly a third of the Latin count.
// Trimming always happens on a sentence boundary — never mid-word.
// ---------------------------------------------------------------------------
export const REPLY_BUDGET = {
  /** zh / ja: ~3 short spoken sentences (「今日好凍呀……你著咗幾多件衫？」) */
  cjk: 68,
  /** Hong Kong Cantonese — DimDik Phase 0 cap (PRD 60; code enforces 48). */
  yue: 48,
  /** en and other Latin scripts: ~3 short spoken sentences */
  latin: 230,
  /** A normal turn is a reply, not a monologue. Recipes/lessons opt out. */
  sentences: 3,
} as const;

const CJK_CHAR = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

/** Character allowance for this reply, decided by the script it is written in. */
export function replyCharBudget(text: string, language?: string): number {
  const dense = text.replace(/\s/g, '');
  if (dense.length === 0) return REPLY_BUDGET.latin;
  const cjk = (text.match(CJK_CHAR) ?? []).length;
  if (cjk * 2 < dense.length) return REPLY_BUDGET.latin;
  if (language === 'yue') return REPLY_BUDGET.yue;
  return REPLY_BUDGET.cjk;
}

function width(s: string): number {
  return s.replace(/\s/g, '').length;
}

const FINAL_MARK = '<|channel|>final<|message|>';
const DANGLING = /^(.*\S)\s+(and|but|so|or|because|then|the|a|an|to|of|for|with|my|your|while|而|但|所以|然後|然后|跟住)$/i;

/** Vague comfort / presence / meta-topic sludge — drop when other sentences remain. */
function isVagueSludge(sentence: string): boolean {
  const s = sentence.trim();
  if (!s) return false;
  if (/^(?:i'?m\s+)?always\s+here\b/i.test(s)) return true;
  if (/everything\s+happens\s+for\s+a\s+reason/i.test(s)) return true;
  if (/hope\s+this\s+helps/i.test(s)) return true;
  if (/you'?ve\s+gone\s+quiet\b|are\s+you\s+still\s+there\b/i.test(s)) return true;
  if (/still\s+on\s+that\s+thread\b|holding\s+the\s+same\s+topic\b|holding\s+this\s+soft\s+moment\b|same\s+page\s+as\s+you\b/i.test(s)) return true;
  if (/充滿電|充满电|電壓感覺友善|voltage feels friendly|tiny burst|soul\s+thread|quantum\s+vibes?|vibe\s+resonance|aura\s+sync|cosmic\s+whisper|soft\s+moment\b|柔軟瞬間|柔软瞬间/.test(s)) return true;
  if (/\b(?:vibronic|soul\s+frequency|manifest(?:ing)?\s+abundance|quantum\s+vibes?|vibe\s+resonance|vibes?\s+check|matches\s+your\s+vibe|vibing)\b|(?:個|的|の)vibe\b|配你vibe|バイブスチェック/.test(s)) return true;
  if (/^(?:我一直都在|一切都会好|希望帮到你|希望幫到你)/.test(s)) return true;
  if (/你靜咗喎|好耐冇聲喎|你安静下来了|静かになっちゃった/.test(s)) return true;
  if (/仲喺你呢條話題|还在你这条话题|輕輕留住同一個主題|轻轻留着同一个主题|輕輕留住呢個柔軟時刻|轻轻留着这个柔软时刻|同你同一頁|和你同一页|同じページにいる/.test(s)) return true;
  return false;
}

function isMeta(sentence: string): boolean {
  const s = sentence.trim();
  if (!s) return false;
  if (/^(as an ai|as a language model)\b/i.test(s)) return true;
  if (/^(reasoning|analysis|note to self)\s*:/i.test(s)) return true;
  if (/^(the user|user (?:asked|wants|is asking|said))\b/i.test(s)) return true;
  if (/^(okay,? so the user|sure,? the user|alright,? the user)\b/i.test(s)) return true;
  if (/^(?:we|i) (?:need to|should|must|will|'ll|’ll) (?:answer|respond|reply)\b/i.test(s) && !/\d/.test(s)) return true;
  if (/^(用戶|用户)(想|問|问|說|说|正在|要求)/.test(s)) return true;
  if (/^(我應該先|我应该先|讓我先|让我先)/.test(s)) return true;
  // Cantonese / CJK reasoning leaks free models still emit after the English ones.
  if (/^(分析|推理|計劃|计划|思考)\s*[:：]/.test(s)) return true;
  if (/^(用戶想要|用户想要|對方想|对方想|需要回覆|需要回复)/.test(s)) return true;
  if (/^(我哋應該|我們應該|我们应该|我要回覆|我要回复)/.test(s)) return true;
  if (isVagueSludge(s)) return true;
  return false;
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    buf += ch;
    // CJK terminators end a sentence with no following space, so they split
    // unconditionally. ASCII marks only split at a word boundary, so a
    // decimal, an abbreviation, or a URL does not get chopped in half.
    // 「…」 is a soft pause in her voice, never a sentence end.
    const cjkEnd = ch === '。' || ch === '！' || ch === '？';
    const latinEnd = ch === '!' || ch === '?';
    const period = ch === '.' && !/\d\.\d/.test(text.slice(Math.max(0, i - 1), i + 2));
    if (!cjkEnd && !latinEnd && !period) continue;
    const next = text.charAt(i + 1);
    if (next === '。' || next === '！' || next === '？' || next === '!') continue;
    if (period && next === '.') continue;
    if ((latinEnd || period) && next && !/[\s\n]/.test(next)) continue;
    const piece = buf.trim();
    if (piece) out.push(piece);
    buf = '';
  }
  const rest = buf.trim();
  if (rest) out.push(rest);
  return out;
}

function stripChannels(text: string): string {
  const at = text.lastIndexOf(FINAL_MARK);
  if (at >= 0) return text.slice(at + FINAL_MARK.length);
  if (text.includes('<|channel|>')) return '';
  const glued = /assistantfinal\s*([\s\S]*)$/i.exec(text);
  const head = glued ? text.slice(0, glued.index) : '';
  if (glued?.[1] && /analysis/i.test(head)) return glued[1];
  return text;
}

function stripThink(text: string): string {
  let s = text.replace(/<think>[\s\S]*?<\/think>/gi, '\n');
  const open = s.search(/<think>/i);
  if (open >= 0) s = s.slice(0, open);
  return s;
}

function trimDangling(text: string): string {
  let s = text.trim();
  for (let i = 0; i < 3; i++) {
    const m = DANGLING.exec(s);
    const next = m?.[1]?.trim() ?? '';
    if (!next) break;
    const words = next.split(/\s+/).length;
    if (words < 3 && !/[。！？!?]$/.test(next)) break;
    s = next;
  }
  return s;
}

function dropCutOffTail(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return text;
  const tail = sentences[sentences.length - 1] ?? '';
  if (/[。！？!?]$/.test(tail) || (tail.endsWith('.') && !/\d\.$/.test(tail))) return text;
  if (isCutOff(tail)) return joinSentences(sentences.slice(0, -1)).trim();
  return text;
}

function isCutOff(tail: string): boolean {
  if (tail.length > 80) return false;
  if (/^(and|but|so|because|then|also|or|um+|uh+|like|the|a|an|to|of|with|for|while|而|但|所以|然後|然后|あと|それで|跟住)\b/i.test(tail)) return true;
  if (/\b(the|a|an|to|of|for|and|my|your|with|嘅|的|を|に|へ)$/i.test(tail)) return true;
  return false;
}

/** Glue risk is Latin-only: CJK never spaces after 。！？, and inserting one
 *  there changes text that was already correct. */
function spaceSentences(text: string): string {
  return text.replace(/([.!?])(?=[A-Za-z0-9])/g, '$1 ');
}

/** Sentences are stored separately, so rejoin them the way the script writes:
 *  CJK runs on with no space after a mark, Latin needs one. */
function joinSentences(parts: string[]): string {
  return parts.join(' ').replace(/([。！？，、；：])\s+(?=[\u3400-\u9fff\u3040-\u30ff])/g, '$1');
}

/** A cook-along or a taught answer is allowed to be long; chat is not. */
export function isDetailedReply(text: string): boolean {
  if (/\b(?:Recipe|Learn)\s*:/.test(text)) return true;
  const markers = text.match(/(?:^|[\s。！？.!?:：])\s*(?:\d{1,2}[.)、]|[-•·])\s+\p{L}/gu);
  if ((markers?.length ?? 0) >= 2) return true;
  return /(?:\bstory\b|tell\s+me\s+a\s+story|fun\s+fact|fun\s+science|science\s+fact|how\s+to\s+fix|step\s+[123])|講個?故|故事|冷知識|豆知識|讲个故|物語|科學趣|点样整|怎麼辦/i.test(text);
}

/**
 * A fetch the user actually asked for — weather, a headline, a place, a
 * recipe, a search — may run a sentence past the normal chat budget, because
 * it is carrying facts they requested. Free chatter never gets this.
 * The labels here are the ones live-tools writes into the fact block.
 */
const ASKED_FOR_FACTS = /^(?:Place|Weather|News|Recent news|Light news|Places|Cafes|Parks|Outings|Recipe|Learn|Web|Shopping|Dining|Events)\b[^:\n]{0,40}:/m;

/** Longer than a chat line on purpose? Then the budget steps aside. */
export function mayRunLong(text: string, world?: string): boolean {
  return isDetailedReply(text) || ASKED_FOR_FACTS.test(world ?? '');
}

/**
 * A reply that says nothing: a lone mood word, a bare ellipsis, or a
 * punctuation-only fragment. Kept when it is the WHOLE reply (「嗯…」 is a
 * real answer to being poked) and dropped only as filler among real lines.
 */
const EMPTY_EMPHASIS =
  /^(?:(?:嗯+|啊+|哦+|喔+|呀+|唉+|哎+|咦+|唔+|okay|ok|oh|ah|hmm+|mm+|well|like|so|right|yeah|yes)[\s…\.。~～,，、!！?？]*|[\s…\.。~～,，、!！?？:：;；()（）\-—]+)$/i;

/** Repeated sentence: compare on letters/digits only, so punctuation drift
 *  and case changes still register as the same line said twice. */
function sentenceKey(sentence: string): string {
  return sentence.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Remove what a small model emits when it has nothing to say: the same
 * sentence twice, and empty "嗯…" padding between real lines. Genuine short
 * answers survive — a one-sentence reply is never touched, and a line is
 * only dropped when something else is left to say.
 *
 * `keepLeadingEmphasis` (streaming) keeps a lone lead-in while the stream is
 * still growing, so a bubble that already showed 「嗯…」 does not blank it out
 * a token later.
 */
export function stripEmptyAndDuplicateSentences(sentences: string[], keepLeadingEmphasis = false): string[] {
  if (sentences.length < 2) return sentences;
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    const key = sentenceKey(s);
    if (!key) continue;                 // punctuation-only fragment
    if (EMPTY_EMPHASIS.test(s.trim())) {
      if (keepLeadingEmphasis && i === 0) { out.push(s); continue; }
      continue;                          // 「嗯…」 padding between real lines
    }
    if (seen.has(key)) continue;        // same sentence said twice
    seen.add(key);
    out.push(s);
  }
  return out.length ? out : sentences.slice(0, 1);
}

/** Cut one runaway sentence at a clause boundary so nothing is cut mid-word. */
function cutLongSentence(sentence: string, budget: number): string {
  const clauses = sentence.split(/(?<=[，,、;；:：])\s*/u);
  if (clauses.length < 2) return sentence;
  let out = '';
  for (const clause of clauses) {
    if (out && width(out + clause) > budget) break;
    out += clause;
  }
  const trimmed = out.trim();
  return trimmed || sentence;
}

/**
 * Keep the reply inside its spoken budget, on sentence boundaries.
 *
 * The closing question is reserved a slot BEFORE the answer sentences are
 * chosen, not swapped in afterwards. That ordering is what makes the streamed
 * preview a strict prefix of the final reply: nothing the bubble already
 * painted ever gets deleted or rewritten in front of the user.
 *
 * `stable` (streaming) never reorders — it only appends.
 */
export function fitReplyBudget(
  sentences: string[],
  budget: number,
  limit = REPLY_BUDGET.sentences,
  stable = false,
): string[] {
  if (!sentences.length) return sentences;
  const last = sentences[sentences.length - 1]!;
  // A question only counts as the reply's own closer when it is a separate
  // sentence; a reply that IS one question is just an answer.
  const hasCloser = sentences.length > 1 && /[?？]\s*$/.test(last);
  const answerLimit = hasCloser ? Math.max(1, limit - 1) : limit;

  const picked: string[] = [];
  let used = 0;
  for (const s of sentences) {
    if (picked.length >= answerLimit) break;
    if (hasCloser && s === last) break;
    const w = width(s);
    if (picked.length > 0 && used + w > budget) break;
    picked.push(s);
    used += w;
  }
  if (picked.length === 0) picked.push(cutLongSentence(sentences[0]!, budget));
  else if (picked.length === 1 && width(picked[0]!) > budget) picked[0] = cutLongSentence(picked[0]!, budget);

  if (hasCloser) {
    // The closer was reserved a slot, so it costs at most the slack budget —
    // and if even that would overflow, the last answer sentence yields to it,
    // because a reply with nothing to answer ends the conversation.
    if (width(picked.join(' ')) + width(last) <= budget + 24) picked.push(last);
    else if (!stable && picked.length > 1) picked[picked.length - 1] = last;
  }
  return picked;
}


/** Drop GPT-OSS / reasoning-model leaks that slip past channel tags. */
function stripReasoningLeak(text: string): string {
  let s = text;
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '\n');
  s = s.replace(/^(?:analysis|reasoning|plan|scratchpad)\s*:\s*[\s\S]*?(?=\n\n|final|assistant|$)/i, '');
  s = s.replace(/assistantfinal\s*/gi, '');
  s = s.replace(/^(?:okay[,.]?\s+)?(?:so\s+)?(?:the\s+)?user\b[^.?!\n]{0,120}[.?!]?\s*/gim, '');
  s = s.replace(/^(?:I need to|I should|Let's|Let me)\b[^.?!\n]{0,100}[.?!]?\s*/gim, '');
  return s;
}

/** Spoken reply: on topic, finished sentences, personality intact. */
export function shapeCompanionReply(raw: string, opts?: ShapeOpts): string {
  let text = stripReasoningLeak(stripChannels(stripThink(raw.replace(/\r/g, ''))));
  text = text.replace(/<\|[^|>]+\|>/g, ' ');
  const sentences = splitSentences(text.replace(/\s+/g, ' ').trim());
  const kept = sentences.filter((s) => !isMeta(s));
  const chosen = stripEmptyAndDuplicateSentences(kept, !!opts?.streaming);
  let body = joinSentences(chosen).replace(/\s{2,}/g, ' ').trim();
  if (!opts?.streaming) {
    body = trimDangling(body);
    body = dropCutOffTail(body);
  }
  // The budget is applied while streaming too, so the bubble never paints text
  // the finished reply is about to delete, and a long model reply stops
  // growing in the UI instead of running on for another ten seconds.
  if (opts?.language === 'yue' && body) body = polishCantoneseReply(body);
  if (!opts?.detailed && !mayRunLong(body, opts?.world)) {
    const budget = replyCharBudget(body, opts?.language);
    body = joinSentences(fitReplyBudget(splitSentences(body), budget, REPLY_BUDGET.sentences, !!opts?.streaming)).trim();
  }
  return stripLaughTokens(spaceSentences(body))
    .replace(/^[\s,，、。;；:：!！?？…·~～]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
