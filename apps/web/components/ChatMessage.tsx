'use client';
// One chat bubble. Split out of ChatPanel so the report affordance can be
// proven by *rendering* the row instead of grepping the 1400-line panel.
//
// The report control exists on AI replies only: the user's own words are not
// model output, so there is nothing for a store reviewer to report there.
import { t, type Lang } from '../lib/prefs';

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
  /** opens the report sheet for this reply */
  onReport: (reply: string) => void;
}

export default function ChatMessage({
  role, content, lang, accent, label, liveClause, tailStreaming, onReport,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const clause = liveClause?.trim() ?? '';
  // While the caption ladder owns the spoken line (tailStreaming, no clause),
  // hide the bubble body so history and the live subtitle never overlap.
  const visible = isUser
    ? content
    : clause || (tailStreaming ? '' : content);
  // The "…" wait bubble is a transient placeholder, not generated text —
  // there is nothing there to report.
  const reportable = !isUser && !tailStreaming && content.trim() !== '' && content.trim() !== '…';
  return (
    <div className={isUser ? 'text-right' : 'text-left'}>
      {!isUser && label && (
        <p className="mb-0.5 pl-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: `${accent}b0` }}>
          {label}
        </p>
      )}
      {visible !== '' && (
        <p
          className={isUser ? '' : clause ? 'text-white/95 italic' : 'text-white/95'}
          style={isUser ? { color: accent } : undefined}
          data-testid={!isUser && clause ? 'speech-caption' : undefined}
          aria-live={!isUser && clause ? 'polite' : undefined}
          aria-atomic={!isUser && clause ? true : undefined}
        >
          {visible}
        </p>
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
