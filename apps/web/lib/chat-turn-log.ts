// Chat log helpers — one guarded, idempotent append path for user turns.
//
// Owner 2026-11-25 (r298): "my message keeps looping on its own, it repeats
// and repeats on its own." The bubble was appended again for the SAME turn:
// the Web Speech recognizer re-delivers already-final results (see
// lib/speech-finals.ts), and send() had no per-message idempotency guard, so
// every re-delivery pushed the same user text into history again.
//
// Rules encoded here:
//   1. every appended user turn gets a stable, unique id (React key);
//   2. appending a turn equal to the last user turn WHILE IT IS STILL
//      UNANSWERED is a no-op — the repeat is dropped, not rendered.

export interface ChatTurn {
  /** Stable unique id (React key). Older persisted rows may lack one. */
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  /** Sealed spoken clauses — prefer over replaying full `content` in the UI. */
  captionLines?: string[];
}

let idSeq = 0;

/** A stable unique id per turn — generated once at append, never in render. */
export function newMessageId(role: 'user' | 'assistant', now: number = Date.now()): string {
  idSeq += 1;
  return `${role}-${now.toString(36)}-${idSeq.toString(36)}`;
}

const norm = (s: string): string => s.replace(/[\s\u3000]+/g, ' ').trim();

/**
 * True when the tail of the log is this user message and no answer has landed
 * since (an empty row or the '…' wait placeholder is not an answer).
 */
export function hasPendingUserTurn(msgs: readonly ChatTurn[], text: string): boolean {
  const want = norm(text);
  if (!want) return false;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const row = msgs[i]!;
    if (row.role === 'assistant') {
      const said = norm(row.content);
      if (said && said !== '…') return false; // answered → a repeat is a new turn
      continue;
    }
    return norm(row.content) === want;
  }
  return false;
}

/**
 * Append one user turn. Returns the SAME array (same reference) when the text
 * duplicates a still-unanswered turn, so callers can tell "dropped".
 * `replace` wipes the log first (r267 new-topic interrupt).
 */
export function appendUserTurn(
  msgs: readonly ChatTurn[],
  text: string,
  opts?: { replace?: boolean; id?: string; now?: number },
): ChatTurn[] {
  const content = text.trim();
  if (!content) return msgs as ChatTurn[];
  if (!opts?.replace && hasPendingUserTurn(msgs, content)) return msgs as ChatTurn[];
  const turn: ChatTurn = {
    id: opts?.id ?? newMessageId('user', opts?.now),
    role: 'user',
    content,
  };
  return opts?.replace ? [turn] : [...msgs, turn];
}
