'use client';
// One chat bubble. Split out of ChatPanel so the report affordance can be
// proven by *rendering* the row instead of grepping the 1400-line panel.
//
// The report control exists on AI replies only: the user's own words are not
// model output, so there is nothing for a store reviewer to report there.
import { t, type Lang } from '../lib/prefs';
import type { TurnMemoryUsed } from '../lib/memory';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  lang: Lang;
  accent: string;
  /** companion name — only the newest reply carries it, as before */
  label?: string;
  /** Current TTS clause while the assistant bubble is still streaming/speaking */
  liveClause?: string;
  /** Tail assistant line is in flux (stream or speak) — hide full text until done */
  tailStreaming?: boolean;
  /** memories injected into her prompt for this turn */
  memoryUsed?: TurnMemoryUsed[];
  onForgetMemory?: (id: string) => void;
  /** opens the report sheet for this reply */
  onReport: (reply: string) => void;
}

export default function ChatMessage({
  role, content, lang, accent, label, liveClause, tailStreaming, memoryUsed, onForgetMemory, onReport,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const clause = liveClause?.trim() ?? '';
  const visible = isUser
    ? content
    : clause || (tailStreaming ? '…' : content);
  // The "…" wait bubble is a transient placeholder, not generated text —
  // there is nothing there to report.
  const reportable = !isUser && !tailStreaming && content.trim() !== '' && content.trim() !== '…';
  const showMemory = !isUser && memoryUsed && memoryUsed.length > 0;
  return (
    <div data-testid="chat-message" className={isUser ? 'text-right' : 'text-left'}>
      {!isUser && label && (
        <p className="mb-0.5 pl-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: `${accent}b0` }}>
          {label}
        </p>
      )}
      <p
        className={`select-text ${isUser ? '' : clause ? 'text-white/95 italic' : 'text-white/95'}`}
        style={isUser ? { color: accent } : undefined}
        data-testid={!isUser && clause ? 'speech-caption' : undefined}
        aria-live={!isUser && clause ? 'polite' : undefined}
        aria-atomic={!isUser && clause ? true : undefined}
      >
        {visible}
      </p>
      {showMemory && (
        <details
          data-testid="memory-turn-used"
          className="ui-btn mt-1 max-w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-left text-[10px] text-white/70"
        >
          <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
            {t(lang, 'memoryTurnUsed')}
          </summary>
          <ul className="mt-1 space-y-0.5" data-testid="memory-turn-list">
            {memoryUsed.map((item) => (
              <li key={item.id} className="flex items-start gap-1" data-memory-id={item.id}>
                <span className="min-w-0 flex-1 break-words select-text text-white/80">{item.snippet}</span>
                {item.deletable && onForgetMemory && (
                  <button
                    type="button"
                    onClick={() => onForgetMemory(item.id)}
                    aria-label={t(lang, 'memoryTurnDeleteAria')}
                    data-testid="memory-turn-forget"
                    className="ui-btn shrink-0 rounded px-1 py-0.5 text-white/40 hover:bg-white/10 hover:text-white/90"
                  >
                    {t(lang, 'memoryTurnDelete')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {reportable && (
        <button
          type="button"
          onClick={() => onReport(content)}
          // Dim by default so it never competes with her words, but always
          // present: phones have no hover state, and a keyboard user must be
          // able to Tab to it.
          aria-label={t(lang, 'reportAria')}
          data-testid="chat-report-button"
          data-report-role="assistant"
          className="ui-btn mt-0.5 rounded-full px-1 py-0.5 text-[10px] leading-none text-white/25 transition-colors hover:bg-white/10 hover:text-white/75 focus-visible:bg-white/10 focus-visible:text-white/85"
        >
          <span aria-hidden>⚑</span> {t(lang, 'reportCta')}
        </button>
      )}
    </div>
  );
}
