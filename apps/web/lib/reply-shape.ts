// Turn a raw model reply into something a companion can actually say.
// Reasoning models leak plans ("the user wants…", channel tags, an unfinished
// tail). Personality stays: laughs, pauses, and a real question are kept.
// Running this twice is a no-op on text it already cleaned.

import { stripLaughTokens } from './speak-text';

export interface ShapeOpts {
  /** A stream is still growing, so an unfinished last clause stays. */
  streaming?: boolean;
}

const FINAL_MARK = '<|channel|>final<|message|>';
const DANGLING = /^(.*\S)\s+(and|but|so|or|because|then|the|a|an|to|of|for|with|my|your|while|而|但|所以|然後|然后|跟住)$/i;

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
  return false;
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    buf += ch;
    const end = ch === '。' || ch === '！' || ch === '？' || ch === '!' || ch === '?';
    const period = ch === '.' && !/\d\.\d/.test(text.slice(Math.max(0, i - 1), i + 2));
    if (!end && !period) continue;
    const next = text.charAt(i + 1);
    if (period && next === '.') continue;
    if (next && !/\s/.test(next) && next !== '\n') continue;
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
  if (isCutOff(tail)) return sentences.slice(0, -1).join(' ').trim();
  return text;
}

function isCutOff(tail: string): boolean {
  if (tail.length > 80) return false;
  if (/^(and|but|so|because|then|also|or|um+|uh+|like|the|a|an|to|of|with|for|while|而|但|所以|然後|然后|あと|それで|跟住)\b/i.test(tail)) return true;
  if (/\b(the|a|an|to|of|for|and|my|your|with|嘅|的|を|に|へ)$/i.test(tail)) return true;
  return false;
}

function spaceSentences(text: string): string {
  return text.replace(/([。！？!?])(?=[^\s])/g, '$1 ');
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
  const chosen = kept.length ? kept : [];
  let body = spaceSentences(chosen.join(' ').replace(/\s{2,}/g, ' ').trim());
  if (!opts?.streaming) {
    body = trimDangling(body);
    body = dropCutOffTail(body);
  }
  return stripLaughTokens(body)
    .replace(/^[,�A�B;�F:\s]+/, '')
    .replace(/s{2,}/g, ' ')
    .trim();
}
