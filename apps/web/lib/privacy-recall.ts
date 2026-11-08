/**
 * Privacy-first conversation policy: never volunteer past chats or push the user
 * to continue. Recall only when they explicitly ask.
 */

export const PRIVACY_CONVERSATION_RULES = `Privacy and memory (non-negotiable):
- Do NOT bring up past conversations, stored memories, diary, plans, promises, or “last time we talked” unless the user's latest message clearly asks you to remember, recall, continue, or retrieve history.
- Do NOT fish for more chat with empty prompts (“tell me more”, “pick up the thread”) that ignore what they just said. One short on-topic closing question about their message is fine.
- If they only say hello or small talk, stay in the moment; do not reference private memory.`;

const RECALL_PATTERNS: RegExp[] = [
  /記得|記住|唔記得|有冇記得|有沒有記得/,
  /之前(?:講|話|傾|聊|講過|傾過)|上次(?:講|話|傾|聊)/,
  /繼續(?:講|傾|聊|說)|承接|講返|傾返|話返|接返/,
  /歷史|紀錄|记录|對話紀錄|聊天记录|傾偈紀錄/,
  /我哋(?:之前|上次).*?(?:講|傾|話)/,
  /你還記得|你还记得|還記得嗎|还记得吗/,
  /\bremember\b/i,
  /\b(?:last|previous)\s+time\b/i,
  /\bwe\s+(?:talked|spoke|discussed)\b/i,
  /\bcontinue\b.*\b(?:story|chat|talk|conversation)\b/i,
  /\bpick\s+up\b.*\b(?:where|thread|left off)\b/i,
  /\bchat\s+history\b|\bconversation\s+history\b/i,
  /\bwhat\s+did\s+i\s+say\b/i,
  /\brecall\b/i,
  /覚えて|思い出して|前回|続き|履歴/,
];

export function userExplicitlyWantsRecall(userText?: string): boolean {
  const t = (userText ?? '').trim();
  if (!t) return false;
  return RECALL_PATTERNS.some((re) => re.test(t));
}
